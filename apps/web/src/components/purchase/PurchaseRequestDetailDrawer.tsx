import type { PurchaseRequestDto } from "@company-erp/shared";
import { DetailDrawer } from "../ui";
import { PurchaseRequestDetail } from "./PurchaseWorkspaceParts";

export function PurchaseRequestDetailDrawer({
  request,
  onClose,
}: {
  request: PurchaseRequestDto | null;
  onClose: () => void;
}) {
  return (
    <DetailDrawer title="采购需求详情" open={Boolean(request)} onClose={onClose}>
      {request ? <PurchaseRequestDetail request={request} /> : null}
    </DetailDrawer>
  );
}
