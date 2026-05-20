import { CertificateFilterToolbar } from "./CertificatesWorkspaceParts";
import { CertificateDetailDrawer } from "./CertificateDetailDrawer";
import { CertificateFormDrawer } from "./CertificateFormDrawer";
import { CertificateReviewTab } from "./CertificateReviewTab";
import { CertificateRiskTab } from "./CertificateRiskTab";
import { certificateTabs } from "./certificateWorkspaceTypes";
import { FoodLicenseTab } from "./FoodLicenseTab";
import { HealthCertificatesTab } from "./HealthCertificatesTab";
import { OtherCertificatesTab } from "./OtherCertificatesTab";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";
import { SectionCard, SegmentedTabs, SummaryCard, WorkspaceScaffold } from "../ui";
import type { ExternalProjectSitePortalSection } from "../project-sites/ExternalProjectSitePortal";

const certificatePortalCopy: Partial<Record<ExternalProjectSitePortalSection, { title: string; description: string }>> = {
  rosterHealth: {
    title: "现场人员/健康证提交",
    description: "健康证应绑定实际在项目点工作的现场人员，提交后等待总部复核。",
  },
  foodLicense: {
    title: "食品经营许可证提交",
    description: "食品经营许可证按绑定项目点提交；不开放供应商或公司主体证照路径给项目点账号。",
  },
};

export function CertificatesWorkspaceView({ model }: { model: CertificatesWorkspaceController }) {
  const portalCopy = model.portalSection ? certificatePortalCopy[model.portalSection] : undefined;

  return (
    <WorkspaceScaffold
      eyebrow="证照风险与审核中心"
      title="证照资质"
      subtitle="默认查看证照风险；审核、健康证和食品经营许可证分区处理。"
      summary={(
        <div className="summary-grid compact-summary">
          <SummaryCard label="有效证照" value={model.validCount} detail="当前有效" tone="success" />
          <SummaryCard label="即将到期" value={model.expiringCount} detail="30 天内风险" tone={model.expiringCount > 0 ? "warning" : "success"} />
          <SummaryCard label="已过期" value={model.expiredCount} detail="阻断风险" tone={model.expiredCount > 0 ? "danger" : "success"} />
          <SummaryCard label="待审核" value={model.pendingReviewCount} detail="总部确认口径" tone={model.pendingReviewCount > 0 ? "info" : "success"} />
        </div>
      )}
      tabs={(
        <>
          <SegmentedTabs
            items={certificateTabs.filter((tab) => {
              if (!model.portalSection) return true;
              return tab.key === "health" || tab.key === "food";
            })}
            activeKey={model.activeTab}
            onChange={model.setActiveTab}
            ariaLabel="证照分区"
          />
          {model.canManage ? (
            <div className="workspace-primary-actions">
              <button type="button" onClick={() => model.setCreateDrawerOpen(true)}>新增证照</button>
            </div>
          ) : null}
        </>
      )}
    >
      {portalCopy ? (
        <SectionCard title={portalCopy.title} badge="项目点账号入口">
          <p className="form-helper">{portalCopy.description}</p>
        </SectionCard>
      ) : null}
      <CertificateFilterToolbar
        query={model.query}
        onQueryChange={model.setQuery}
        statusFilter={model.statusFilter}
        onStatusFilterChange={model.setStatusFilter}
      />
      {model.activeTab === "risk" ? <CertificateRiskTab model={model} /> : null}
      {model.activeTab === "review" ? <CertificateReviewTab model={model} /> : null}
      {model.activeTab === "health" ? <HealthCertificatesTab model={model} /> : null}
      {model.activeTab === "food" ? <FoodLicenseTab model={model} /> : null}
      {model.activeTab === "other" ? <OtherCertificatesTab model={model} /> : null}
      <CertificateFormDrawer model={model} />
      <CertificateDetailDrawer model={model} />
    </WorkspaceScaffold>
  );
}
