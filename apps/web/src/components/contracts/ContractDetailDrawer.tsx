import type { ContractDto } from "@company-erp/shared";
import { BusinessAttachmentsPanel } from "../BusinessAttachmentsPanel";
import { contractExpiryToBadge } from "../statusMappers";
import { DetailDrawer, SegmentedTabs, StatusBadge, type TabItem } from "../ui";
import {
  contractFormLabel,
  contractStatusLabel,
  directionLabel,
  formatContractDateTime,
  formatMoney,
  investmentCategoryLabel,
  subjectCategoryLabel,
} from "./contractsTypes";
import type { AttachmentRecordDto } from "@company-erp/shared";
import type { AttachmentFilters } from "../../apiClient";
import { useEffect, useState } from "react";

type ContractDetailTab = "basic" | "attachments";

const detailTabs: TabItem<ContractDetailTab>[] = [
  { key: "basic", label: "基本信息" },
  { key: "attachments", label: "附件" },
];

export function ContractDetailDrawer({
  contract,
  canManage,
  loadAttachments,
  getAttachmentDownloadUrl,
  onClose,
}: {
  contract: ContractDto | null;
  canManage: boolean;
  loadAttachments: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  getAttachmentDownloadUrl: (id: string) => Promise<string>;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ContractDetailTab>("basic");

  useEffect(() => {
    setActiveTab("basic");
  }, [contract?.id]);

  return (
    <DetailDrawer title="合同详情" open={Boolean(contract)} onClose={onClose}>
      {contract ? (
        <>
          <ContractDetailHeader contract={contract} />
          <SegmentedTabs items={detailTabs} activeKey={activeTab} onChange={setActiveTab} ariaLabel="合同详情分区" />
          {activeTab === "basic" ? <ContractDetail contract={contract} /> : null}
          {activeTab === "attachments" ? (
            <BusinessAttachmentsPanel
              ownerModule="contracts"
              ownerEntityType="contract"
              ownerEntityId={contract.id}
              canManage={canManage}
              legacyPaths={[{ label: "主附件引用（历史路径）", value: contract.attachmentRef }]}
              loadAttachments={loadAttachments}
              getAttachmentDownloadUrl={getAttachmentDownloadUrl}
            />
          ) : null}
        </>
      ) : null}
    </DetailDrawer>
  );
}

function ContractDetailHeader({ contract }: { contract: ContractDto }) {
  const expiryBadge = contractExpiryToBadge(contract.expiryState);
  return (
    <div className="record-detail-header">
      <div>
        <p className="form-hint">{contract.contractNo}</p>
        <h4>{contract.contractName}</h4>
      </div>
      <div className="ui-inline-actions">
        <StatusBadge tone={contract.status === "active" ? "success" : "disabled"}>
          {contractStatusLabel.get(contract.status) ?? contract.status}
        </StatusBadge>
        <StatusBadge tone={expiryBadge.tone}>{expiryBadge.label}</StatusBadge>
      </div>
    </div>
  );
}

function ContractDetail({ contract }: { contract: ContractDto }) {
  return (
    <dl className="detail-grid">
      <dt>合同编号</dt>
      <dd>{contract.contractNo}</dd>
      <dt>合同名称</dt>
      <dd>{contract.contractName}</dd>
      <dt>相对方</dt>
      <dd>{contract.counterpartyPartyName ?? contract.counterpartyNameSnapshot}</dd>
      <dt>合同方向</dt>
      <dd>{directionLabel.get(contract.direction)}</dd>
      <dt>合同形态</dt>
      <dd>{contractFormLabel.get(contract.contractForm)}</dd>
      <dt>合同标的</dt>
      <dd>{subjectCategoryLabel.get(contract.subjectCategory)}</dd>
      <dt>投入分类</dt>
      <dd>{contract.investmentCategory ? investmentCategoryLabel.get(contract.investmentCategory) : "非投入类合同"}</dd>
      <dt>项目点</dt>
      <dd>{contract.projectSiteName ?? "-"}</dd>
      <dt>业务项目</dt>
      <dd>{contract.businessProjectName ?? "-"}</dd>
      <dt>起止日期</dt>
      <dd>{contract.startDate} / {contract.endDate ?? "长期"}</dd>
      <dt>金额/预算</dt>
      <dd>{formatMoney(contract.amount, contract.currency)} / {formatMoney(contract.budgetAmount, contract.currency)}</dd>
      <dt>到期状态</dt>
      <dd>{contractExpiryToBadge(contract.expiryState).label}</dd>
      <dt>更新时间</dt>
      <dd>{formatContractDateTime(contract.updatedAt)}</dd>
      <dt>附件状态</dt>
      <dd>{contract.attachmentRef ? "已登记" : "未上传；当前合同仅用于到期提醒，PDF 扫描件可后续补传。"}</dd>
    </dl>
  );
}
