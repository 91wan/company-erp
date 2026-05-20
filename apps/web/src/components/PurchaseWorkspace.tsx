import { PurchaseWorkspaceView } from "./purchase/PurchaseWorkspaceView";
import { usePurchaseWorkspaceController } from "./purchase/usePurchaseWorkspaceController";
import type { PurchaseWorkspaceProps } from "./purchase/purchaseWorkspaceTypes";

export function PurchaseWorkspace(props: PurchaseWorkspaceProps) {
  const model = usePurchaseWorkspaceController(props);
  return <PurchaseWorkspaceView model={model} />;
}
