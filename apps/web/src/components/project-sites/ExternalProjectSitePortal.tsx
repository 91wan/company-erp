import { ClipboardCheck, FileText, ShieldCheck, Users } from "lucide-react";
import { PageHeader, SummaryCard, ComplianceChecklist } from "../ui";

export function ExternalProjectSitePortal({
  visibleProjectSiteCount,
  pendingUsageCount,
  equipmentCount,
  pendingEquipmentChangeCount,
}: {
  visibleProjectSiteCount: number;
  pendingUsageCount: number;
  equipmentCount: number;
  pendingEquipmentChangeCount: number;
}) {
  return (
    <section className="external-project-site-portal" aria-label="外部项目点门户">
      <PageHeader
        eyebrow="项目点门户"
        title="我的项目点"
        subtitle="这里只展示当前绑定项目点的资料提交、物料领用和总部审核状态。项目点账号不能维护总部主数据、查看成本金额或操作其他项目点。"
      />
      <div className="portal-summary-grid">
        <SummaryCard label="我的项目点" value={visibleProjectSiteCount} detail="由后台账号绑定" tone="info" />
        <SummaryCard label="待处理领用" value={pendingUsageCount} detail="等待总部或仓库处理" tone={pendingUsageCount > 0 ? "warning" : "success"} />
        <SummaryCard label="厨房设备" value={equipmentCount} detail="本项目点可见设备" tone="neutral" />
        <SummaryCard label="设备变更待审" value={pendingEquipmentChangeCount} detail="总部审核后才更新台账" tone={pendingEquipmentChangeCount > 0 ? "warning" : "success"} />
      </div>
      <ComplianceChecklist
        items={[
          {
            title: "项目点现场人员名单",
            description: "维护实际在项目点工作的人员，不等同于公司 HR 员工。",
            tone: "info",
            action: <Users aria-hidden="true" size={18} />,
          },
          {
            title: "健康证与食品经营许可证",
            description: "健康证绑定项目点现场人员；食品经营许可证绑定项目点。",
            tone: "warning",
            action: <ShieldCheck aria-hidden="true" size={18} />,
          },
          {
            title: "雇主责任险与工资表",
            description: "保险和工资表提交后需等待总部审核，不以附件上传作为自动合规。",
            tone: "info",
            action: <FileText aria-hidden="true" size={18} />,
          },
          {
            title: "物料领用申请",
            description: "只填写物料、数量、用途和期望日期；总部仓库负责出库。",
            tone: "success",
            action: <ClipboardCheck aria-hidden="true" size={18} />,
          },
        ]}
      />
    </section>
  );
}
