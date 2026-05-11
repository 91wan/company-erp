import { Boxes, Filter, PackagePlus, RefreshCw, Save, Search, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  MATERIAL_CATEGORIES,
  WAREHOUSE_TYPES,
  type CreateMaterialInput,
  type CreateWarehouseInput,
  type MaterialDto,
  type WarehouseDto,
} from "@company-erp/shared";

type MaterialsWarehousesWorkspaceProps = {
  loadMaterials?: () => Promise<MaterialDto[]>;
  loadWarehouses?: () => Promise<WarehouseDto[]>;
  createMaterial?: (input: CreateMaterialInput) => Promise<MaterialDto>;
  createWarehouse?: (input: CreateWarehouseInput) => Promise<WarehouseDto>;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const statusLabel = new Map([
  ["enabled", "启用"],
  ["disabled", "停用"],
]);
const warehouseTypeLabel = new Map(WAREHOUSE_TYPES.map((warehouseType) => [warehouseType.code, warehouseType.label]));

async function defaultLoadMaterials(): Promise<MaterialDto[]> {
  const response = await fetch(`${apiBaseUrl}/api/materials`);

  if (!response.ok) {
    throw new Error(`Materials request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { materials: MaterialDto[] };
  return payload.materials;
}

async function defaultLoadWarehouses(): Promise<WarehouseDto[]> {
  const response = await fetch(`${apiBaseUrl}/api/warehouses`);

  if (!response.ok) {
    throw new Error(`Warehouses request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { warehouses: WarehouseDto[] };
  return payload.warehouses;
}

async function defaultCreateMaterial(input: CreateMaterialInput): Promise<MaterialDto> {
  const response = await fetch(`${apiBaseUrl}/api/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Material create failed with ${response.status}`);
  }

  const payload = (await response.json()) as { material: MaterialDto };
  return payload.material;
}

async function defaultCreateWarehouse(input: CreateWarehouseInput): Promise<WarehouseDto> {
  const response = await fetch(`${apiBaseUrl}/api/warehouses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Warehouse create failed with ${response.status}`);
  }

  const payload = (await response.json()) as { warehouse: WarehouseDto };
  return payload.warehouse;
}

export function MaterialsWarehousesWorkspace({
  loadMaterials = defaultLoadMaterials,
  loadWarehouses = defaultLoadWarehouses,
  createMaterial = defaultCreateMaterial,
  createWarehouse = defaultCreateWarehouse,
}: MaterialsWarehousesWorkspaceProps) {
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [materialStatus, setMaterialStatus] = useState<"loading" | "ready" | "error">("loading");
  const [warehouseStatus, setWarehouseStatus] = useState<"loading" | "ready" | "error">("loading");
  const [materialQuery, setMaterialQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [materialSubmitState, setMaterialSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [warehouseSubmitState, setWarehouseSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [materialForm, setMaterialForm] = useState<CreateMaterialInput>({
    materialCode: "",
    materialName: "",
    materialCategory: "定制物料",
    baseUnit: "",
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
      const matchesCategory = categoryFilter === "all" || material.materialCategory === categoryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          material.materialCode,
          material.materialName,
          material.specification,
          material.defaultWarehouseName,
          material.defaultSupplierPartyName,
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

      return [warehouse.warehouseCode, warehouse.warehouseName, warehouse.managerName, warehouse.managerPhone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [warehouseQuery, warehouses]);

  async function handleMaterialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMaterialSubmitState("saving");

    try {
      const created = await createMaterial(materialForm);
      setMaterials((current) => [created, ...current.filter((material) => material.id !== created.id)]);
      setMaterialForm({
        materialCode: "",
        materialName: "",
        materialCategory: "定制物料",
        baseUnit: "",
        status: "enabled",
      });
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
      setWarehouses((current) => [created, ...current.filter((warehouse) => warehouse.id !== created.id)]);
      setWarehouseForm({
        warehouseCode: "",
        warehouseName: "",
        warehouseType: "headquarters",
        status: "enabled",
      });
      setWarehouseSubmitState("idle");
    } catch {
      setWarehouseSubmitState("error");
    }
  }

  return (
    <section className="materials-warehouses-workspace" aria-label="物料和仓库基础资料">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">基础资料</span>
          <h2>物料基础</h2>
          <p>维护总部库存需要的物料编码、类别、单位、安全库存和默认供应商。</p>
        </div>
        <span className="parties-total">
          <Boxes aria-hidden="true" size={18} />
          {materials.length} 个物料
        </span>
      </div>

      <div className="party-summary material-summary" aria-label="物料指标摘要">
        {MATERIAL_CATEGORIES.map((category) => {
          const count = materials.filter((material) => material.materialCategory === category).length;
          return (
            <article key={category}>
              <span>{category}</span>
              <strong>{count}</strong>
            </article>
          );
        })}
      </div>

      <div className="parties-layout">
        <section className="dashboard-panel table-panel">
          <div className="party-toolbar">
            <label className="party-search">
              <Search aria-hidden="true" size={16} />
              <input
                value={materialQuery}
                onChange={(event) => setMaterialQuery(event.target.value)}
                placeholder="搜索物料编码、名称、规格、供应商"
              />
            </label>
            <label className="party-filter">
              <Filter aria-hidden="true" size={16} />
              <select
                aria-label="物料类别筛选"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">全部类别</option>
                {MATERIAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {materialStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载物料资料..." /> : null}
          {materialStatus === "error" ? <StateMessage text="物料资料加载失败" /> : null}
          {materialStatus === "ready" && filteredMaterials.length === 0 ? <StateMessage text="暂无物料资料" /> : null}
          {materialStatus === "ready" && filteredMaterials.length > 0 ? (
            <MaterialsTable materials={filteredMaterials} />
          ) : null}
        </section>

        <form className="dashboard-panel party-form" onSubmit={handleMaterialSubmit}>
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
              onChange={(event) => setMaterialForm((current) => ({ ...current, materialCode: event.target.value }))}
            />
          </label>
          <label>
            <span>物料名称</span>
            <input
              required
              value={materialForm.materialName}
              onChange={(event) => setMaterialForm((current) => ({ ...current, materialName: event.target.value }))}
            />
          </label>
          <label>
            <span>物料类别</span>
            <select
              value={materialForm.materialCategory}
              onChange={(event) =>
                setMaterialForm((current) => ({ ...current, materialCategory: event.target.value }))
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
              onChange={(event) => setMaterialForm((current) => ({ ...current, baseUnit: event.target.value }))}
            />
          </label>
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

          {materialSubmitState === "error" ? <p className="form-error">保存失败，请检查编码是否重复或稍后重试。</p> : null}
        </form>
      </div>

      <div className="parties-heading warehouse-heading">
        <div>
          <span className="section-kicker">基础资料</span>
          <h2>仓库基础</h2>
          <p>MVP 只管理无锡总部真实库存，不管理项目点现场库存。</p>
        </div>
        <span className="parties-total">
          <Warehouse aria-hidden="true" size={18} />
          {warehouses.length} 个仓库
        </span>
      </div>

      <div className="parties-layout">
        <section className="dashboard-panel table-panel">
          <div className="party-toolbar warehouse-toolbar">
            <label className="party-search">
              <Search aria-hidden="true" size={16} />
              <input
                value={warehouseQuery}
                onChange={(event) => setWarehouseQuery(event.target.value)}
                placeholder="搜索仓库编码、名称、负责人、电话"
              />
            </label>
          </div>

          {warehouseStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载仓库资料..." /> : null}
          {warehouseStatus === "error" ? <StateMessage text="仓库资料加载失败" /> : null}
          {warehouseStatus === "ready" && filteredWarehouses.length === 0 ? <StateMessage text="暂无仓库资料" /> : null}
          {warehouseStatus === "ready" && filteredWarehouses.length > 0 ? (
            <WarehousesTable warehouses={filteredWarehouses} />
          ) : null}
        </section>

        <form className="dashboard-panel party-form" onSubmit={handleWarehouseSubmit}>
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
                setWarehouseForm((current) => ({ ...current, warehouseCode: event.target.value }))
              }
            />
          </label>
          <label>
            <span>仓库名称</span>
            <input
              required
              value={warehouseForm.warehouseName}
              onChange={(event) =>
                setWarehouseForm((current) => ({ ...current, warehouseName: event.target.value }))
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
                  warehouseType: event.target.value as CreateWarehouseInput["warehouseType"],
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
                setWarehouseForm((current) => ({ ...current, managerName: event.target.value || null }))
              }
            />
          </label>
          <label>
            <span>负责人电话</span>
            <input
              value={warehouseForm.managerPhone ?? ""}
              onChange={(event) =>
                setWarehouseForm((current) => ({ ...current, managerPhone: event.target.value || null }))
              }
            />
          </label>

          {warehouseSubmitState === "error" ? (
            <p className="form-error">保存失败，请检查编码是否重复或稍后重试。</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function MaterialsTable({ materials }: { materials: MaterialDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编码</th>
            <th>名称</th>
            <th>类别</th>
            <th>单位</th>
            <th>默认仓库</th>
            <th>默认供应商</th>
            <th>安全库存</th>
            <th>状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id}>
              <td>{material.materialCode}</td>
              <td>
                <strong>{material.materialName}</strong>
                <small>{material.specification || "未设置规格"}</small>
              </td>
              <td>{material.materialCategory}</td>
              <td>{material.baseUnit}</td>
              <td>{material.defaultWarehouseName || "-"}</td>
              <td>{material.defaultSupplierPartyName || "-"}</td>
              <td>{material.safeStock ?? "-"}</td>
              <td>
                <span className={`status-badge ${material.status === "enabled" ? "green" : "orange"}`}>
                  {statusLabel.get(material.status)}
                </span>
              </td>
              <td>{formatDateTime(material.updatedAt)}</td>
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
                <span className={`status-badge ${warehouse.status === "enabled" ? "green" : "orange"}`}>
                  {statusLabel.get(warehouse.status)}
                </span>
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
    <div className="party-state">
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
