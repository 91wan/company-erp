import { useEffect, useMemo, useRef, useState } from "react";
import type { ImportJobDto, ImportJobRowDto } from "@company-erp/shared";
import { SectionCard } from "../ui";
import type { NavigationIntent } from "../shell/dashboardShellNavigation";
import type { ExcelImportController } from "./useExcelImportController";

function dateValue(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithin30Days(date: Date, now: Date) {
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
}

function importedRows(details: ImportJobDto[], templateType: string): ImportJobRowDto[] {
  return details
    .filter((job) => job.status === "confirmed" && job.templateType === templateType)
    .flatMap((job) => job.rows.filter((row) => row.status === "imported"));
}

export function ImportPilotReviewPanel({ model }: { model: ExcelImportController }) {
  const [details, setDetails] = useState<ImportJobDto[]>([]);
  const detailCache = useRef(new Map<string, ImportJobDto>());

  useEffect(() => {
    let mounted = true;
    const confirmedJobs = model.jobs
      .filter((job) => job.status === "confirmed")
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 20);
    const missingJobs = confirmedJobs.filter((job) => !detailCache.current.has(job.id));
    Promise.all(missingJobs.map((job) => model.handleLoadDetail(job.id).catch(() => null))).then((loaded) => {
      loaded.filter(Boolean).forEach((job) => detailCache.current.set((job as ImportJobDto).id, job as ImportJobDto));
      if (mounted) {
        setDetails(confirmedJobs.map((job) => detailCache.current.get(job.id)).filter(Boolean) as ImportJobDto[]);
      }
    });
    return () => { mounted = false; };
  }, [model.jobs, model.handleLoadDetail]);

  const review = useMemo(() => {
    const now = new Date();
    const contracts = importedRows(details, "contracts");
    const healthCertificates = importedRows(details, "health_certificates");
    const projectSiteHealth = healthCertificates.filter((row) =>
      row.normalizedData?.healthCertificateOwnerTypeLabel === "项目点健康证" || Boolean(row.normalizedData?.ownerRosterPersonId),
    );
    const companyHealth = healthCertificates.filter((row) =>
      row.normalizedData?.healthCertificateOwnerTypeLabel === "公司健康证" || Boolean(row.normalizedData?.ownerEmployeeId),
    );
    const healthExpiryDates = healthCertificates.map((row) => dateValue(row.normalizedData?.expiryDate)).filter(Boolean) as Date[];
    const contractEndDates = contracts.map((row) => dateValue(row.normalizedData?.endDate)).filter(Boolean) as Date[];
    const affectedProjectSiteIds = new Set(projectSiteHealth.map((row) => row.normalizedData?.ownerProjectSiteId).filter(Boolean));
    const openingRows = importedRows(details, "opening_inventory").filter((row) => row.normalizedData?.movementType === "opening");
    const warehouses = new Set(openingRows.map((row) => row.normalizedData?.warehouseCode).filter(Boolean));
    const materials = new Set(openingRows.map((row) => row.normalizedData?.materialCode).filter(Boolean));
    const recentJobs = model.jobs.filter((job) => Date.now() - new Date(job.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000);
    return {
      contracts: {
        total: contracts.length,
        expired: contractEndDates.filter((date) => date < now).length,
        expiringSoon: contractEndDates.filter((date) => isWithin30Days(date, now)).length,
      },
      health: {
        total: healthCertificates.length,
        expired: healthExpiryDates.filter((date) => date < now).length,
        expiringSoon: healthExpiryDates.filter((date) => isWithin30Days(date, now)).length,
        projectSite: projectSiteHealth.length,
        company: companyHealth.length,
      },
      projectSites: {
        affected: affectedProjectSiteIds.size,
        blocking: projectSiteHealth.filter((row) => {
          const expiryDate = dateValue(row.normalizedData?.expiryDate);
          return expiryDate ? expiryDate < now : false;
        }).length,
        warning: projectSiteHealth.filter((row) => {
          const expiryDate = dateValue(row.normalizedData?.expiryDate);
          return expiryDate ? isWithin30Days(expiryDate, now) : false;
        }).length,
      },
      inventory: {
        rows: openingRows.length,
        warehouses: warehouses.size,
        materials: materials.size,
      },
      issues: {
        errorBatches: recentJobs.filter((job) => (job.errorRows ?? 0) > 0).length,
        warningBatches: recentJobs.filter((job) => (job.warningRows ?? 0) > 0).length,
        previewed: recentJobs.filter((job) => job.status === "previewed").length,
      },
    };
  }, [details, model.jobs]);

  const hasData = review.contracts.total + review.health.total + review.projectSites.affected + review.inventory.rows +
    review.issues.errorBatches + review.issues.warningBatches + review.issues.previewed > 0;

  if (!hasData) {
    return (
      <SectionCard title="试点复核">
        <div className="workspace-state">
          <strong>暂无导入后复核任务</strong>
          <span>统计范围：最近 20 个确认批次。</span>
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      <p className="workspace-help-text">统计范围：最近 20 个确认批次，以及最近 7 天的错误、警告和待确认批次。</p>
      <div className="import-pilot-review-grid" aria-label="试点复核任务">
      <ReviewCard
        title="合同复核"
        status={review.contracts.expired + review.contracts.expiringSoon > 0 ? "待复核" : "正常"}
        lines={[`最近导入 ${review.contracts.total} 条`, `已到期 ${review.contracts.expired} 条`, `30 天内到期 ${review.contracts.expiringSoon} 条`]}
        actionLabel="去合同风险"
        target={{ workspace: "合同", tab: "risk" }}
        onNavigate={model.onNavigate}
      />
      <ReviewCard
        title="健康证复核"
        status={review.health.expired + review.health.expiringSoon > 0 ? "待复核" : "正常"}
        lines={[
          `最近导入 ${review.health.total} 条`,
          `已过期 ${review.health.expired} 条`,
          `30 天内到期 ${review.health.expiringSoon} 条`,
          `项目点健康证 ${review.health.projectSite} 条`,
          `公司健康证 ${review.health.company} 条`,
        ]}
        actionLabel="去证照健康证"
        target={{ workspace: "证照资质", tab: "health" }}
        onNavigate={model.onNavigate}
      />
      <ReviewCard
        title="项目点合规复核"
        status={review.projectSites.blocking > 0 ? "有风险" : review.projectSites.warning > 0 ? "待复核" : "正常"}
        lines={[`受影响项目点 ${review.projectSites.affected} 个`, `阻断风险 ${review.projectSites.blocking} 个`, `黄色预警 ${review.projectSites.warning} 个`]}
        actionLabel="去项目点风险台账"
        target={{ workspace: "项目点", tab: "risk" }}
        onNavigate={model.onNavigate}
      />
      <ReviewCard
        title="库存复核"
        status={review.inventory.rows > 0 ? "待复核" : "正常"}
        lines={[`期初库存 ${review.inventory.rows} 行`, `仓库 ${review.inventory.warehouses} 个`, `物料 ${review.inventory.materials} 个`]}
        actionLabel="去库存流水"
        target={{ workspace: "库存", tab: "movements" }}
        onNavigate={model.onNavigate}
      />
      <ReviewCard
        title="错误/警告复核"
        status={review.issues.errorBatches > 0 ? "有风险" : review.issues.previewed > 0 ? "待确认" : review.issues.warningBatches > 0 ? "待复核" : "正常"}
        lines={[`错误批次 ${review.issues.errorBatches} 个`, `警告批次 ${review.issues.warningBatches} 个`, `待确认批次 ${review.issues.previewed} 个`]}
        actionLabel="去导入批次"
        target={{ workspace: "Excel 导入", tab: "jobs" }}
        onNavigate={model.onNavigate}
      />
      </div>
    </>
  );
}

function ReviewCard({
  title,
  status,
  lines,
  actionLabel,
  target,
  onNavigate,
}: {
  title: string;
  status: "正常" | "待复核" | "有风险" | "待确认";
  lines: string[];
  actionLabel: string;
  target: NavigationIntent;
  onNavigate?: (intent: NavigationIntent) => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="import-pilot-review-status">{status}</div>
      <ul className="import-pilot-review-list">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
      {onNavigate ? (
        <button type="button" className="secondary-action" onClick={() => onNavigate(target)}>
          {actionLabel}
        </button>
      ) : null}
    </SectionCard>
  );
}
