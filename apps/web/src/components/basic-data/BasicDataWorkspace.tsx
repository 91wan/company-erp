import { useEffect, useState } from "react";
import { PartiesWorkspace } from "../PartiesWorkspace";
import { MaterialsWarehousesWorkspace } from "../MaterialsWarehousesWorkspace";
import { SegmentedTabs } from "../ui";

type BasicDataTab = "parties" | "materials" | "warehouses";

export type BasicDataWorkspaceProps = {
  canManage?: boolean;
  initialTab?: string;
  initialEntityId?: string;
};

const TABS: { key: BasicDataTab; label: string }[] = [
  { key: "parties", label: "往来方" },
  { key: "materials", label: "物料" },
  { key: "warehouses", label: "仓库" },
];

function isBasicDataTab(v?: string): v is BasicDataTab {
  return v === "parties" || v === "materials" || v === "warehouses";
}

export function BasicDataWorkspace({ canManage = true, initialTab, initialEntityId }: BasicDataWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BasicDataTab>(
    isBasicDataTab(initialTab) ? initialTab : "parties"
  );

  useEffect(() => {
    if (isBasicDataTab(initialTab)) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="basic-data-workspace">
      <div className="basic-data-tab-bar">
        <SegmentedTabs items={TABS} activeKey={activeTab} onChange={setActiveTab} ariaLabel="基础资料分区" />
      </div>
      {initialEntityId ? (
        <div className="workspace-state workspace-state--info" role="status">
          <span>
            已从导入结果跳转至{activeTab === "parties" ? "往来方" : activeTab === "materials" ? "物料" : "仓库"}台账，
            请搜索对应记录核查（记录不可见时请检查筛选条件或权限）。
          </span>
        </div>
      ) : null}
      {activeTab === "parties" ? (
        <PartiesWorkspace canManage={canManage} />
      ) : null}
      {activeTab === "materials" || activeTab === "warehouses" ? (
        <MaterialsWarehousesWorkspace canManage={canManage} initialTab={activeTab} />
      ) : null}
    </div>
  );
}
