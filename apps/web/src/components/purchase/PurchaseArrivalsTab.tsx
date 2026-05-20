import { EmptyState } from "../ui";

export function PurchaseArrivalsTab() {
  return (
    <EmptyState
      title="暂无到货记录"
      description="当前到货与入库闭环在库存模块登记；稳定接口开放后在此分区展示到货记录。"
    />
  );
}
