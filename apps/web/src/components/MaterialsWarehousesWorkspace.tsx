import {
  Boxes,
  Filter,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Warehouse,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  MATERIAL_CATEGORIES,
  WAREHOUSE_TYPES,
  type CreateMaterialInput,
  type CreateWarehouseInput,
  type MaterialDto,
  type WarehouseDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";
import {
  FormDrawer,
  SectionCard,
  SegmentedTabs,
  StatusBadge,
  SummaryCard,
  Toolbar,
  WorkspaceScaffold,
  type TabItem,
} from "./ui";

type MaterialsWarehousesWorkspaceProps = {
  loadMaterials?: () => Promise<MaterialDto[]>;
  loadWarehouses?: () => Promise<WarehouseDto[]>;
  createMaterial?: (input: CreateMaterialInput) => Promise<MaterialDto>;
  createWarehouse?: (input: CreateWarehouseInput) => Promise<WarehouseDto>;
  canManage?: boolean;
  initialTab?: string;
  initialEntityId?: string;
};

type MaterialsWarehousesTab = "materials" | "warehouses";
type MaterialsWarehousesFormDrawer = MaterialsWarehousesTab | null;

const materialsWarehousesTabs: TabItem<MaterialsWarehousesTab>[] = [
  { key: "materials", label: "物料" },
  { key: "warehouses", label: "仓库" },
];

const statusLabel = new Map([
  ["enabled", "启用"],
  ["disabled", "停用"],
]);
const warehouseTypeLabel = new Map(
  WAREHOUSE_TYPES.map((warehouseType) => [
    warehouseType.code,
    warehouseType.label,
  ]),
);

async function defaultLoadMaterials(): Promise<MaterialDto[]> {
  const payload = await requestJson<{ materials: MaterialDto[] }>(
    `${apiBaseUrl}/api/materials`,
  );
  return payload.materials;
}

async function defaultLoadWarehouses(): Promise<WarehouseDto[]> {
  const payload = await requestJson<{ warehouses: WarehouseDto[] }>(
    `${apiBaseUrl}/api/warehouses`,
  );
  return payload.warehouses;
}

async function defaultCreateMaterial(
  input: CreateMaterialInput,
): Promise<MaterialDto> {
  const payload = await requestJson<{ material: MaterialDto }>(
    `${apiBaseUrl}/api/materials`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.material;
}

async function defaultCreateWarehouse(
  input: CreateWarehouseInput,
): Promise<WarehouseDto> {
  const payload = await requestJson<{ warehouse: WarehouseDto }>(
    `${apiBaseUrl}/api/warehouses`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.warehouse;
}

export function MaterialsWarehousesWorkspace({
  loadMaterials = defaultLoadMaterials,
  loadWarehouses = defaultLoadWarehouses,
  createMaterial = defaultCreateMaterial,
  createWarehouse = defaultCreateWarehouse,
  canManage = true,
  initialTab,
  initialEntityId,
}: MaterialsWarehousesWorkspaceProps) {
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [materialStatus, setMaterialStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [warehouseStatus, setWarehouseStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const isMaterialsTab = (v?: string): v is MaterialsWarehousesTab => v === "materials" || v === "warehouses";
  const [activeTab, setActiveTab] =
    useState<MaterialsWarehousesTab>(isMaterialsTab(initialTab) ? initialTab : "materials");
  useEffect(() => {
    if (isMaterialsTab(initialTab)) setActiveTab(initialTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const [materialQuery, setMaterialQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseQuery, setWarehouseQuery] = useState("");

  useEffect(() => {
    if (!initialEntityId) return;
    if (activeTab === "materials") setMaterialQuery(initialEntityId);
    if (activeTab === "warehouses") setWarehouseQuery(initialEntityId);
  }, [activeTab, initialEntityId]);
  const [materialSubmitState, setMaterialSubmitState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [warehouseSubmitState, setWarehouseSubmitState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [openFormDrawer, setOpenFormDrawer] =
    useState<MaterialsWarehousesFormDrawer>(null);
  const [materialForm, setMaterialForm] = useState<CreateMaterialInput>({
    materialCode: "",
    materialName: "",
    materialCategory: "定制物料",
    baseUnit: "",
    isProjectSiteSaleEnabled: false,
    isConsumable: false,
    status: "enabled",
  });
  const [warehouseForm, setWarehouseForm] = useState<CreateWarehouseInput>({
    warehouseCode: "",
    warehouseName: "",
    warehouseType: "headquarters",
    status: "enabled",
  });

  useEffect(() => {
    let mounted = true;

    setMaterialStatus("loading");
    loadMaterials()
      .then((nextMaterials) => {
        if (!mounted) return;
        setMaterials(nextMaterials);
        setMaterialStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMaterialStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [loadMaterials]);

  useEffect(() => {
    let mounted = true;

    setWarehouseStatus("loading");
    loadWarehouses()
      .then((nextWarehouses) => {
        if (!mounted) return;
        setWarehouses(nextWarehouses);
        setWarehouseStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setWarehouseStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [loadWarehouses]);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = materialQuery.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesCategory =
        categoryFilter === "all" ||
        material.materialCategory === categoryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          material.materialCode,
          material.materialName,
          material.specification,
          material.defaultWarehouseName,
          material.defaultSupplierPartyName,
          material.id,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, materialQuery, materials]);

  const filteredWarehouses = useMemo(() => {
    const normalizedQuery = warehouseQuery.trim().toLowerCase();

    return warehouses.filter((warehouse) => {
      if (normalizedQuery.length === 0) return true;

      return [
        warehouse.warehouseCode,
        warehouse.warehouseName,
        warehouse.managerName,
        warehouse.managerPhone,
        warehouse.id,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [warehouseQuery, warehouses]);

  async function handleMaterialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMaterialSubmitState("saving");

    try {
      const created = await createMaterial(materialForm);
      setMaterials((current) => [
        created,
        ...current.filter((material) => material.id !== created.id),
      ]);
      setMaterialForm({
        materialCode: "",
        materialName: "",
        materialCategory: "定制物料",
        baseUnit: "",
        isProjectSiteSaleEnabled: false,
        isConsumable: false,
        status: "enabled",
      });
      setOpenFormDrawer(null);
      setMaterialSubmitState("idle");
    } catch {
      setMaterialSubmitState("error");
    }
  }

  async function handleWarehouseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWarehouseSubmitState("saving");

    try {
      const created = await createWarehouse(warehouseForm);
      setWarehouses((current) => [
        created,
        ...current.filter((warehouse) => warehouse.id !== created.id),
      ]);
      setWarehouseForm({
        warehouseCode: "",
        warehouseName: "",
        warehouseType: "headquarters",
        status: "enabled",
      });
      setOpenFormDrawer(null);
      setWarehouseSubmitState("idle");
    } catch {
      setWarehouseSubmitState("error");
    }
  }

  const summary = (
    <div className="summary-grid" aria-label="物料与仓库指标摘要">
      {MATERIAL_CATEGORIES.map((category) => {
        const count = materials.filter(
          (material) => material.materialCategory === category,
        ).length;
        return (
          <SummaryCard
            key={category}
            label={category}
            value={count}
            detail="物料类别"
            tone="neutral"
          />
        );
      })}
      <SummaryCard
        label="仓库"
        value={warehouses.length}
        detail="总部库存仓库"
        tone="info"
      />
    </div>
  );

  const tabs = (
    <>
      <SegmentedTabs
        items={materialsWarehousesTabs}
        activeKey={activeTab}
        onChange={(nextTab) => {
          setActiveTab(nextTab);
          setOpenFormDrawer(null);
        }}
        ariaLabel="物料仓库分区"
      />
      {canManage ? (
        <div className="workspace-primary-actions">
          <button type="button" onClick={() => setOpenFormDrawer(activeTab)}>
            {activeTab === "materials" ? "新增物料" : "新增仓库"}
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <WorkspaceScaffold
      eyebrow="基础资料"
      title="物料与仓库"
      subtitle="分区维护物料、仓库和库存基础口径。"
      actions={
        <span className="parties-total">
          <Boxes aria-hidden="true" size={18} />
          {materials.length} 个物料
        </span>
      }
      summary={summary}
      tabs={tabs}
    >
      <section
        className="materials-warehouses-workspace"
        aria-label="物料和仓库基础资料"
      >
        {activeTab === "materials" ? (
          <>
            <SectionCard
              title="物料台账"
              action={<Boxes aria-hidden="true" size={17} />}
            >
              {initialEntityId ? (
                <div className="workspace-state workspace-state--info" role="status">
                  <span>已跳转物料台账，请核查记录 ID：{initialEntityId}。</span>
                </div>
              ) : null}
              <Toolbar
                search={
                  <label className="table-search">
                    <Search aria-hidden="true" size={16} />
                    <input
                      value={materialQuery}
                      onChange={(event) => setMaterialQuery(event.target.value)}
                      placeholder="搜索物料编码、名称、规格、供应商"
                    />
                  </label>
                }
                filters={
                  <label className="table-filter">
                    <Filter aria-hidden="true" size={16} />
                    <select
                      aria-label="物料类别筛选"
                      value={categoryFilter}
                      onChange={(event) =>
                        setCategoryFilter(event.target.value)
                      }
                    >
                      <option value="all">全部类别</option>
                      {MATERIAL_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                }
              />

              {materialStatus === "loading" ? (
                <StateMessage
                  icon={<RefreshCw size={18} />}
                  text="加载物料资料..."
                />
              ) : null}
              {materialStatus === "error" ? (
                <StateMessage text="物料资料加载失败" />
              ) : null}
              {materialStatus === "ready" && filteredMaterials.length === 0 ? (
                <StateMessage text="暂无物料资料" />
              ) : null}
              {materialStatus === "ready" && filteredMaterials.length > 0 ? (
                <MaterialsTable materials={filteredMaterials} />
              ) : null}
            </SectionCard>
          </>
        ) : null}

        {activeTab === "warehouses" ? (
          <>
            <SectionCard
              title="仓库台账"
              action={<Warehouse aria-hidden="true" size={17} />}
            >
              {initialEntityId ? (
                <div className="workspace-state workspace-state--info" role="status">
                  <span>已跳转仓库台账，请核查记录 ID：{initialEntityId}。</span>
                </div>
              ) : null}
              <Toolbar
                search={
                  <label className="table-search">
                    <Search aria-hidden="true" size={16} />
                    <input
                      value={warehouseQuery}
                      onChange={(event) =>
                        setWarehouseQuery(event.target.value)
                      }
                      placeholder="搜索仓库编码、名称、负责人、电话"
                    />
                  </label>
                }
              />

              {warehouseStatus === "loading" ? (
                <StateMessage
                  icon={<RefreshCw size={18} />}
                  text="加载仓库资料..."
                />
              ) : null}
              {warehouseStatus === "error" ? (
                <StateMessage text="仓库资料加载失败" />
              ) : null}
              {warehouseStatus === "ready" &&
              filteredWarehouses.length === 0 ? (
                <StateMessage text="暂无仓库资料" />
              ) : null}
              {warehouseStatus === "ready" && filteredWarehouses.length > 0 ? (
                <WarehousesTable warehouses={filteredWarehouses} />
              ) : null}
            </SectionCard>
          </>
        ) : null}
      </section>
      <FormDrawer
        title="新增物料"
        open={openFormDrawer === "materials"}
        onClose={() => setOpenFormDrawer(null)}
      >
        <form
          className="dashboard-panel workspace-form"
          onSubmit={handleMaterialSubmit}
        >
          <div className="panel-header">
            <h3>新增物料</h3>
            <button type="submit" disabled={materialSubmitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存物料
            </button>
          </div>

          <label>
            <span>物料编码</span>
            <input
              required
              value={materialForm.materialCode}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  materialCode: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>物料名称</span>
            <input
              required
              value={materialForm.materialName}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  materialName: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>物料类别</span>
            <select
              value={materialForm.materialCategory}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  materialCategory: event.target.value,
                }))
              }
            >
              {MATERIAL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>基本单位</span>
            <input
              required
              value={materialForm.baseUnit}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  baseUnit: event.target.value,
                }))
              }
            />
          </label>
          <p className="form-hint">
            当前物料入库、出库和领用数量统一按整数处理，不允许录入小数。
          </p>
          <label>
            <span>安全库存</span>
            <input
              min="0"
              type="number"
              value={materialForm.safeStock ?? ""}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  safeStock: event.target.value ? Number(event.target.value) : null,
                }))
              }
            />
          </label>
          <label className="form-check-row">
            <input
              type="checkbox"
              checked={materialForm.isProjectSiteSaleEnabled ?? false}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  isProjectSiteSaleEnabled: event.target.checked,
                }))
              }
            />
            <span>项目点领用收费</span>
          </label>
          <label>
            <span>采购参考价</span>
            <input
              min="0"
              step="0.0001"
              type="number"
              value={materialForm.purchaseReferencePrice ?? ""}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  purchaseReferencePrice: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
            />
          </label>
          <label>
            <span>项目点收费价</span>
            <input
              min="0"
              step="0.0001"
              type="number"
              value={materialForm.projectSiteSalePrice ?? ""}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  projectSiteSalePrice: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
            />
          </label>
          <p className="form-hint">
            金额单位固定为人民币元；物料领用和库存数量单位使用上方基本单位。
          </p>
          <label>
            <span>收费备注</span>
            <input
              value={materialForm.projectSiteSaleRemark ?? ""}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  projectSiteSaleRemark: event.target.value || null,
                }))
              }
            />
          </label>
          <label className="form-check-row">
            <input
              type="checkbox"
              checked={materialForm.isConsumable ?? false}
              onChange={(event) =>
                setMaterialForm((current) => ({
                  ...current,
                  isConsumable: event.target.checked,
                }))
              }
            />
            <span>耗材</span>
          </label>

          {materialSubmitState === "error" ? (
            <p className="form-error">保存失败，请检查编码是否重复或稍后重试。</p>
          ) : null}
        </form>
      </FormDrawer>
      <FormDrawer
        title="新增仓库"
        open={openFormDrawer === "warehouses"}
        onClose={() => setOpenFormDrawer(null)}
      >
        <form
          className="dashboard-panel workspace-form"
          onSubmit={handleWarehouseSubmit}
        >
          <div className="panel-header">
            <h3>新增仓库</h3>
            <button type="submit" disabled={warehouseSubmitState === "saving"}>
              <PackagePlus aria-hidden="true" size={15} />
              保存仓库
            </button>
          </div>

          <label>
            <span>仓库编码</span>
            <input
              required
              value={warehouseForm.warehouseCode}
              onChange={(event) =>
                setWarehouseForm((current) => ({
                  ...current,
                  warehouseCode: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>仓库名称</span>
            <input
              required
              value={warehouseForm.warehouseName}
              onChange={(event) =>
                setWarehouseForm((current) => ({
                  ...current,
                  warehouseName: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>仓库类型</span>
            <select
              value={warehouseForm.warehouseType}
              onChange={(event) =>
                setWarehouseForm((current) => ({
                  ...current,
                  warehouseType: event.target
                    .value as CreateWarehouseInput["warehouseType"],
                }))
              }
            >
              {WAREHOUSE_TYPES.map((warehouseType) => (
                <option key={warehouseType.code} value={warehouseType.code}>
                  {warehouseType.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>负责人</span>
            <input
              value={warehouseForm.managerName ?? ""}
              onChange={(event) =>
                setWarehouseForm((current) => ({
                  ...current,
                  managerName: event.target.value || null,
                }))
              }
            />
          </label>
          <label>
            <span>负责人电话</span>
            <input
              value={warehouseForm.managerPhone ?? ""}
              onChange={(event) =>
                setWarehouseForm((current) => ({
                  ...current,
                  managerPhone: event.target.value || null,
                }))
              }
            />
          </label>

          {warehouseSubmitState === "error" ? (
            <p className="form-error">保存失败，请检查编码是否重复或稍后重试。</p>
          ) : null}
        </form>
      </FormDrawer>
    </WorkspaceScaffold>
  );
}

function MaterialsTable({ materials }: { materials: MaterialDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编码</th>
            <th>名称/类别</th>
            <th>单位</th>
            <th>默认仓库</th>
            <th>库存口径</th>
            <th>项目点计价</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id}>
              <td>{material.materialCode}</td>
              <td>
                <strong>{material.materialName}</strong>
                <small>{material.materialCategory}</small>
                <small>{material.specification || "未设置规格"}</small>
              </td>
              <td>
                {material.baseUnit}
                <small>数量口径：整数</small>
              </td>
              <td>{material.defaultWarehouseName || "-"}</td>
              <td>
                安全库存 {material.safeStock ?? "-"}
                <small>{material.isConsumable ? "耗材" : "非耗材"}</small>
              </td>
              <td>
                {material.isProjectSiteSaleEnabled &&
                material.projectSiteSalePrice !== null &&
                material.projectSiteSalePrice !== undefined
                  ? `${material.projectSiteSalePrice} 元`
                  : "不收费"}
                {material.isProjectSiteSaleEnabled &&
                material.projectSiteSaleRemark ? (
                  <small>{material.projectSiteSaleRemark}</small>
                ) : null}
              </td>
              <td>
                <StatusBadge
                  tone={material.status === "enabled" ? "success" : "disabled"}
                >
                  {statusLabel.get(material.status)}
                </StatusBadge>
                <small>{formatDateTime(material.updatedAt)}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarehousesTable({ warehouses }: { warehouses: WarehouseDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编码</th>
            <th>名称</th>
            <th>类型</th>
            <th>负责人</th>
            <th>电话</th>
            <th>状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((warehouse) => (
            <tr key={warehouse.id}>
              <td>{warehouse.warehouseCode}</td>
              <td>{warehouse.warehouseName}</td>
              <td>{warehouseTypeLabel.get(warehouse.warehouseType)}</td>
              <td>{warehouse.managerName || "-"}</td>
              <td>{warehouse.managerPhone || "-"}</td>
              <td>
                <StatusBadge
                  tone={warehouse.status === "enabled" ? "success" : "disabled"}
                >
                  {statusLabel.get(warehouse.status)}
                </StatusBadge>
              </td>
              <td>{formatDateTime(warehouse.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="workspace-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
