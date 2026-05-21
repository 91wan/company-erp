import { FileBadge } from "lucide-react";
import { useMemo, useState } from "react";
import type { CertificateRecordDto } from "@company-erp/shared";
import { certificateStatusToBadge } from "../statusMappers";
import { DataTable, SectionCard, StatusBadge, Toolbar } from "../ui";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";

type HealthCertificateScope = "all" | "site" | "company";

export function HealthCertificatesTab({ model }: { model: CertificatesWorkspaceController }) {
  const [scope, setScope] = useState<HealthCertificateScope>("all");
  const healthCertificates = useMemo(
    () => model.visibleCertificates.filter((certificate) => certificate.certificateType === "person_health_cert"),
    [model.visibleCertificates],
  );
  const filteredCertificates = useMemo(
    () =>
      healthCertificates.filter((certificate) => {
        if (scope === "site") return Boolean(certificate.ownerRosterPersonId);
        if (scope === "company") return Boolean(certificate.ownerEmployeeId);
        return true;
      }),
    [healthCertificates, scope],
  );

  return (
    <SectionCard title="健康证" action={<FileBadge aria-hidden="true" size={18} />}>
      <Toolbar
        filters={(
          <label className="table-filter">
            <span>健康证类型</span>
            <select value={scope} aria-label="健康证类型" onChange={(event) => setScope(event.target.value as HealthCertificateScope)}>
              <option value="all">全部健康证</option>
              <option value="site">项目点健康证</option>
              <option value="company">公司健康证</option>
            </select>
          </label>
        )}
      />
      <DataTable
        headers={["健康证类型", "归属人", "项目点", "到期日期", "状态", "附件状态"]}
        rows={filteredCertificates.map((certificate) => {
          const status = certificateStatusToBadge(certificate.computedStatus);
          return [
            <span key={`${certificate.id}-type`} className="table-cell-stack">
              <strong>{healthCertificateScopeLabel(certificate)}</strong>
              <small>{certificate.certificateName}</small>
            </span>,
            certificate.ownerNameSnapshot,
            certificate.ownerProjectSiteName ?? rosterProjectSiteName(certificate, model.rosterPeople) ?? "-",
            certificate.expiryDate ?? "-",
            <StatusBadge key={`${certificate.id}-status`} tone={status.tone}>{status.label}</StatusBadge>,
            certificate.relatedAttachments?.length ? "已登记" : certificate.attachmentPath || certificate.sourceFilePath ? "旧路径字段" : "未登记",
          ];
        })}
        emptyState="暂无健康证到期资料"
        onRowClick={(index) => {
          const certificate = filteredCertificates[index];
          if (certificate) model.setSelectedCertificateId(certificate.id);
        }}
      />
    </SectionCard>
  );
}

function healthCertificateScopeLabel(certificate: CertificateRecordDto): string {
  if (certificate.ownerRosterPersonId) return "项目点健康证";
  if (certificate.ownerEmployeeId) return "公司健康证";
  return "健康证";
}

function rosterProjectSiteName(certificate: CertificateRecordDto, rosterPeople: CertificatesWorkspaceController["rosterPeople"]): string | null {
  if (!certificate.ownerRosterPersonProjectSiteId) return null;
  return rosterPeople.find((person) => person.projectSiteId === certificate.ownerRosterPersonProjectSiteId)?.projectSiteName ?? null;
}
