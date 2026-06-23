import { useEffect, useState } from "react";
import type { PurchaseRequestDto } from "@company-erp/shared";
import { BusinessAttachmentsPanel } from "../BusinessAttachmentsPanel";
import { EntityActivityPanel } from "../EntityActivityPanel";
import { DetailDrawer, SegmentedTabs, type TabItem } from "../ui";
import { PurchaseRequestDetail } from "./PurchaseWorkspaceParts";

type PurchaseRequestDetailTab = "details" | "attachments" | "activity";

const purchaseRequestActivityLabels = {
  "purchase_request.create": "创建采购需求",
  "purchase_request.update": "更新采购需求",
  "purchase_request.submit": "提交采购需求",
  "purchase_request.approve": "审批通过采购需求",
  "purchase_request.reject": "驳回采购需求",
};

export function PurchaseRequestDetailDrawer({
  request,
  canManage = false,
  canReadAuditLogs = false,
  onClose,
}: {
  request: PurchaseRequestDto | null;
  canManage?: boolean;
  canReadAuditLogs?: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<PurchaseRequestDetailTab>("details");

  useEffect(() => {
    setActiveTab("details");
  }, [request?.id]);

  const tabs: TabItem<PurchaseRequestDetailTab>[] = [
    { key: "details", label: "详情" },
    { key: "attachments", label: "附件" },
    ...(canReadAuditLogs ? [{ key: "activity" as const, label: "操作记录" }] : []),
  ];

  return (
    <DetailDrawer title="采购需求详情" open={Boolean(request)} onClose={onClose}>
      {request ? (
        <>
          <SegmentedTabs items={tabs} activeKey={activeTab} onChange={setActiveTab} ariaLabel="采购需求详情分区" />
          {activeTab === "details" ? <PurchaseRequestDetail request={request} /> : null}
          {activeTab === "attachments" ? (
            <BusinessAttachmentsPanel
              ownerModule="purchases"
              ownerEntityType="purchase_request"
              ownerEntityId={request.id}
              canManage={canManage}
            />
          ) : null}
          {activeTab === "activity" && canReadAuditLogs ? (
            <EntityActivityPanel
              entityType="purchase_request"
              entityId={request.id}
              actionLabels={purchaseRequestActivityLabels}
            />
          ) : null}
        </>
      ) : null}
    </DetailDrawer>
  );
}
