import { useState } from "react";
import type { AppConfigDto } from "@company-erp/shared";
import { SegmentedTabs, StatusBadge as UiStatusBadge, WorkspaceScaffold, type TabItem } from "../ui";
import { AttachmentsLedgerPanel } from "./AttachmentsLedgerPanel";
import { AuditLogPanel } from "./AuditLogPanel";
import { CompanySettingsPanel } from "./CompanySettingsPanel";
import { VersionPanel } from "./VersionPanel";

type SystemSettingsWorkspaceProps = {
  companyName: string;
  canManage: boolean;
  canReadAuditLogs: boolean;
  canReadAttachments: boolean;
  onCompanyNameChange: (appConfig: AppConfigDto) => void;
};

type SystemSettingsTab = "company" | "version" | "attachments" | "audit";

export function SystemSettingsWorkspace({
  companyName,
  canManage,
  canReadAuditLogs,
  canReadAttachments,
  onCompanyNameChange,
}: SystemSettingsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>("company");
  const tabs: TabItem<SystemSettingsTab>[] = [
    { key: "company", label: "公司信息" },
    { key: "version", label: "版本与健康检查" },
    ...(canReadAttachments ? [{ key: "attachments" as const, label: "附件管理" }] : []),
    ...(canReadAuditLogs ? [{ key: "audit" as const, label: "审计日志" }] : []),
  ];

  return (
    <WorkspaceScaffold
      eyebrow="基础与系统"
      title="系统设置"
      subtitle="分区查看公司信息、部署版本、附件管理和审计日志。"
      actions={<UiStatusBadge tone={canManage ? "success" : "disabled"}>{canManage ? "管理员可修改" : "只读查看"}</UiStatusBadge>}
      tabs={<SegmentedTabs items={tabs} activeKey={activeTab} onChange={setActiveTab} ariaLabel="系统设置分区" />}
    >
      <section className="system-settings-workspace">
        {activeTab === "company" ? (
          <CompanySettingsPanel companyName={companyName} canManage={canManage} onCompanyNameChange={onCompanyNameChange} />
        ) : null}
        {activeTab === "version" ? <VersionPanel /> : null}
        {activeTab === "attachments" && canReadAttachments ? <AttachmentsLedgerPanel /> : null}
        {activeTab === "audit" && canReadAuditLogs ? <AuditLogPanel /> : null}
      </section>
    </WorkspaceScaffold>
  );
}
