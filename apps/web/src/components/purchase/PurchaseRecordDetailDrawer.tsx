import type { PurchaseRecordDto } from "@company-erp/shared";
import { DetailDrawer } from "../ui";
import { PurchaseRecordDetail } from "./PurchaseWorkspaceParts";

export function PurchaseRecordDetailDrawer({
  record,
  onClose,
}: {
  record: PurchaseRecordDto | null;
  onClose: () => void;
}) {
  return (
    <DetailDrawer title="采购记录详情" open={Boolean(record)} onClose={onClose}>
      {record ? <PurchaseRecordDetail record={record} /> : null}
    </DetailDrawer>
  );
}
