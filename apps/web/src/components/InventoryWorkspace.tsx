import { ClipboardList, Filter, PackageCheck, RefreshCw, Save, Search, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_SOURCE_TYPES,
  type CreateInventoryMovementInput,
  type InventoryBalanceDto,
  type InventoryMovementDto,
  type InventoryMovementTypeCode,
  type MaterialDto,
  type WarehouseDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";
import { PageHeader, SectionCard, StatusBadge, SummaryCard, Toolbar } from "./ui";

type InventoryWorkspaceProps = {
  loadInventoryMovements?: () => Promise<InventoryMovementDto[]>;
  loadInventoryBalances?: () => Promise<InventoryBalanceDto[]>;
  createInventoryMovement?: (input: CreateInventoryMovementInput) => Promise<InventoryMovementDto>;
  loadMaterials?: () => Promise<MaterialDto[]>;
  loadWarehouses?: () => Promise<WarehouseDto[]>;
  canManage?: boolean;
  showBalances?: boolean;
};

type MovementFormState = {
  movementNo: string;
  movementDate: string;
  movementType: Extract<InventoryMovementTypeCode, "opening" | "inbound" | "adjustment_in">;
  sourceType: CreateInventoryMovementInput["sourceType"];
  warehouseId: string;
  materialId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  purchaseRecordNo: string;
  purchaseRecordLineId: string;
  handledBy: string;
  remark: string;
};

const movementTypeLabel = new Map(INVENTORY_MOVEMENT_TYPES.map((movementType) => [movementType.code, movementType.label]));
const sourceTypeLabel = new Map(INVENTORY_SOURCE_TYPES.map((sourceType) => [sourceType.code, sourceType.label]));
const creatableMovementTypes = INVENTORY_MOVEMENT_TYPES.filter((movementType) =>
  ["opening", "inbound", "adjustment_in"].includes(movementType.code),
);

async function defaultLoadInventoryMovements(): Promise<InventoryMovementDto[]> {
  const payload = await requestJson<{ inventoryMovements: InventoryMovementDto[] }>(
    `${apiBaseUrl}/api/inventory-movements`,
  );
  return payload.inventoryMovements;
}

async function defaultLoadInventoryBalances(): Promise<InventoryBalanceDto[]> {
  const payload = await requestJson<{ inventoryBalances: InventoryBalanceDto[] }>(
    `${apiBaseUrl}/api/inventory-balances`,
  );
  return payload.inventoryBalances;
}

async function defaultLoadMaterials(): Promise<MaterialDto[]> {
  const payload = await requestJson<{ materials: MaterialDto[] }>(`${apiBaseUrl}/api/materials`);
  return payload.materials;
}

async function defaultLoadWarehouses(): Promise<WarehouseDto[]> {
  const payload = await requestJson<{ warehouses: WarehouseDto[] }>(`${apiBaseUrl}/api/warehouses`);
  return payload.warehouses;
}

async function defaultCreateInventoryMovement(input: CreateInventoryMovementInput): Promise<InventoryMovementDto> {
  const payload = await requestJson<{ inventoryMovement: InventoryMovementDto }>(
    `${apiBaseUrl}/api/inventory-movements`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return payload.inventoryMovement;
}

export function InventoryWorkspace({
  loadInventoryMovements = defaultLoadInventoryMovements,
  loadInventoryBalances = defaultLoadInventoryBalances,
  createInventoryMovement = defaultCreateInventoryMovement,
  loadMaterials = defaultLoadMaterials,
  loadWarehouses = defaultLoadWarehouses,
  canManage = true,
  showBalances = true,
}: InventoryWorkspaceProps) {
  const [movements, setMovements] = useState<InventoryMovementDto[]>([]);
  const [balances, setBalances] = useState<InventoryBalanceDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [movementStatus, setMovementStatus] = useState<"loading" | "ready" | "error">("loading");
  const [balanceStatus, setBalanceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [movementFilter, setMovementFilter] = useState<"all" | InventoryMovementTypeCode>("all");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [form, setForm] = useState<MovementFormState>({
    movementNo: "",
    movementDate: "",
    movementType: "inbound",
    sourceType: "purchase",
    warehouseId: "",
    materialId: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    purchaseRecordNo: "",
    purchaseRecordLineId: "",
    handledBy: "",
    remark: "",
  });

  useEffect(() => {
    let mounted = true;
    setMovementStatus("loading");
    loadInventoryMovements()
      .then((nextMovements) => {
        if (!mounted) return;
        setMovements(nextMovements);
        setMovementStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMovementStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadInventoryMovements]);

  useEffect(() => {
    let mounted = true;
    if (!showBalances) {
      setBalances([]);
      setBalanceStatus("ready");
      return () => {
        mounted = false;
      };
    }
    setBalanceStatus("loading");
    loadInventoryBalances()
      .then((nextBalances) => {
        if (!mounted) return;
        setBalances(nextBalances);
        setBalanceStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setBalanceStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadInventoryBalances, showBalances]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    Promise.all([loadMaterials(), loadWarehouses()])
      .then(([nextMaterials, nextWarehouses]) => {
        if (!mounted) return;
        setMaterials(nextMaterials);
        setWarehouses(nextWarehouses);
        setMasterStatus("ready");
        setForm((current) => ({
          ...current,
          materialId: current.materialId || nextMaterials[0]?.id || "",
          warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
          unit: current.unit || nextMaterials[0]?.baseUnit || "",
        }));
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadMaterials, loadWarehouses]);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesType = movementFilter === "all" || movement.movementType === movementFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          movement.movementNo,
          movement.purchaseRecordNo,
          movement.materialCode,
          movement.materialName,
          movement.warehouseCode,
          movement.warehouseName,
          movement.handledBy,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesType && matchesQuery;
    });
  }, [movementFilter, movements, query]);

  const lowStockCount = balances.filter((balance) => balance.isLowStock).length;
  const inboundQuantity = movements
    .filter((movement) => movement.movementType === "inbound")
    .reduce((sum, movement) => sum + movement.quantity, 0);

  function updateSelectedMaterial(materialId: string) {
    const material = materials.find((candidate) => candidate.id === materialId);
    setForm((current) => ({
      ...current,
      materialId,
      unit: material?.baseUnit || current.unit,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");

    try {
      const created = await createInventoryMovement({
        movementNo: form.movementNo,
        movementDate: form.movementDate,
        movementType: form.movementType,
        sourceType: form.sourceType || null,
        warehouseId: form.warehouseId,
        materialId: form.materialId,
        quantity: Number(form.quantity),
        unit: form.unit,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        purchaseRecordNo: form.purchaseRecordNo || null,
        purchaseRecordLineId: form.purchaseRecordLineId || null,
        handledBy: form.handledBy || null,
        remark: form.remark || null,
      });
      setMovements((current) => [created, ...current.filter((movement) => movement.id !== created.id)]);
      if (showBalances) {
        setBalances(await loadInventoryBalances());
      }
      setForm((current) => ({
        movementNo: "",
        movementDate: "",
        movementType: "inbound",
        sourceType: "purchase",
        warehouseId: current.warehouseId,
        materialId: current.materialId,
        quantity: "",
        unit: current.unit,
        unitPrice: "",
        purchaseRecordNo: "",
        purchaseRecordLineId: "",
        handledBy: "",
        remark: "",
      }));
      setSubmitState("idle");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <section className="inventory-workspace" aria-label="库存管理">
      <PageHeader
        eyebrow="库存风险与流水"
        title="库存管理"
        subtitle="总部仓库入库登记、库存流水和当前库存余额查询；低库存风险在工作台与本页同步突出。"
        actions={(
          <span className="parties-total">
            <Warehouse aria-hidden="true" size={18} />
            {balances.length} 个库存项
          </span>
        )}
      />

      <div className="inventory-heading">
        <p>{"采购记录 -> 仓库入库 -> 库存流水 -> 当前库存余额"}</p>
        <span>当前库存 = 库存流水数量按仓库 + 物料汇总</span>
      </div>

      <div className="inventory-tabs" aria-label="库存模块功能">
        <button type="button" aria-current="page">入库登记</button>
        <button type="button">库存流水</button>
        {showBalances ? <button type="button">当前库存查询</button> : null}
        <button type="button" disabled>公司内部出库 后续开放</button>
        <button type="button" disabled>项目点领用出库 请到项目点模块办理</button>
      </div>

      <div className="summary-grid" aria-label="库存指标摘要">
        <SummaryCard label="库存流水" value={movements.length} detail="最近出入库记录" tone="info" />
        <SummaryCard label="当前库存项" value={balances.length} detail={showBalances ? "按仓库和物料汇总" : "无权限查看余额"} tone={showBalances ? "neutral" : "disabled"} />
        <SummaryCard label="低库存" value={lowStockCount} detail="低于安全库存" tone={lowStockCount > 0 ? "danger" : "success"} />
        <SummaryCard label="本轮入库数量" value={inboundQuantity} detail="入库流水合计" tone="success" />
      </div>

      <div className="people-section-grid">
        <SectionCard title="库存流水" action={<ClipboardList aria-hidden="true" size={16} />}>
          <Toolbar
            search={(
              <label className="table-search">
              <Search aria-hidden="true" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索单号、物料、仓库、经办人"
              />
              </label>
            )}
            filters={(
              <label className="table-filter">
              <Filter aria-hidden="true" size={16} />
              <select
                aria-label="库存流水类型筛选"
                value={movementFilter}
                onChange={(event) => setMovementFilter(event.target.value as "all" | InventoryMovementTypeCode)}
              >
                <option value="all">全部类型</option>
                {INVENTORY_MOVEMENT_TYPES.map((movementType) => (
                  <option key={movementType.code} value={movementType.code}>
                    {movementType.label}
                  </option>
                ))}
              </select>
              </label>
            )}
          />
          {movementStatus === "loading" ? (
            <StateMessage icon={<RefreshCw size={16} />} text="库存流水加载中" />
          ) : movementStatus === "error" ? (
            <StateMessage icon={<PackageCheck size={16} />} text="库存流水接口暂不可用" />
          ) : filteredMovements.length === 0 ? (
            <StateMessage icon={<PackageCheck size={16} />} text="暂无库存流水" />
          ) : (
            <ResponsiveTable
              headers={["单号", "日期", "类型", "仓库", "物料", "数量", "来源", "经办人"]}
              rows={filteredMovements.map((movement) => [
                movement.movementNo,
                movement.movementDate,
                movementTypeLabel.get(movement.movementType) ?? movement.movementType,
                movement.warehouseCode,
                `${movement.materialCode} ${movement.materialName}`,
                `${movement.quantity} ${movement.unit}`,
                movement.sourceType ? sourceTypeLabel.get(movement.sourceType) ?? movement.sourceType : "-",
                movement.handledBy ?? "-",
              ])}
            />
          )}
        </SectionCard>

        {canManage ? <form className="dashboard-panel party-form" onSubmit={handleSubmit} aria-label="入库登记表单">
          <div className="panel-header people-panel-title">
            <h3>
              <PackageCheck aria-hidden="true" size={16} />
              入库登记
            </h3>
            <button type="submit" disabled={submitState === "saving" || masterStatus !== "ready"}>
              <Save aria-hidden="true" size={15} />
              {submitState === "saving" ? "保存中" : "保存"}
            </button>
          </div>
          <label>
            <span>入库单号</span>
            <input value={form.movementNo} onChange={(event) => setForm({ ...form, movementNo: event.target.value })} />
          </label>
          <label>
            <span>入库日期</span>
            <input
              type="date"
              value={form.movementDate}
              onChange={(event) => setForm({ ...form, movementDate: event.target.value })}
            />
          </label>
          <label>
            <span>仓库</span>
            <select value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}>
              <option value="">选择仓库</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouseCode} {warehouse.warehouseName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>物料</span>
            <select value={form.materialId} onChange={(event) => updateSelectedMaterial(event.target.value)}>
              <option value="">选择物料</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.materialCode} {material.materialName}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>数量和来源</legend>
            <label>
              <span>入库数量</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              />
            </label>
            <label>
              <span>单位</span>
              <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            </label>
            <label>
              <span>流水类型</span>
              <select
                value={form.movementType}
                onChange={(event) =>
                  setForm({ ...form, movementType: event.target.value as MovementFormState["movementType"] })
                }
              >
                {creatableMovementTypes.map((movementType) => (
                  <option key={movementType.code} value={movementType.code}>
                    {movementType.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>来源类型</span>
              <select
                value={form.sourceType ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    sourceType: (event.target.value || null) as CreateInventoryMovementInput["sourceType"],
                  })
                }
              >
                <option value="">未指定</option>
                {INVENTORY_SOURCE_TYPES.map((sourceType) => (
                  <option key={sourceType.code} value={sourceType.code}>
                    {sourceType.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <label>
            <span>采购单号</span>
            <input
              value={form.purchaseRecordNo}
              onChange={(event) => setForm({ ...form, purchaseRecordNo: event.target.value })}
            />
          </label>
          <label>
            <span>采购明细 ID</span>
            <input
              value={form.purchaseRecordLineId}
              onChange={(event) => setForm({ ...form, purchaseRecordLineId: event.target.value })}
            />
          </label>
          <label>
            <span>经办人</span>
            <input value={form.handledBy} onChange={(event) => setForm({ ...form, handledBy: event.target.value })} />
          </label>
          <label>
            <span>备注</span>
            <input value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} />
          </label>
          {masterStatus === "error" ? <p className="form-error">物料或仓库接口暂不可用，暂不能登记入库。</p> : null}
          {submitState === "error" ? <p className="form-error">入库登记失败，请检查必填项或单号是否重复。</p> : null}
        </form> : null}
      </div>

      {showBalances ? <SectionCard title="当前库存查询" action={<Warehouse aria-hidden="true" size={16} />}>
        {balanceStatus === "loading" ? (
          <StateMessage icon={<RefreshCw size={16} />} text="当前库存加载中" />
        ) : balanceStatus === "error" ? (
          <StateMessage icon={<Warehouse size={16} />} text="当前库存接口暂不可用" />
        ) : balances.length === 0 ? (
          <StateMessage icon={<Warehouse size={16} />} text="暂无当前库存" />
        ) : (
          <ResponsiveTable
            headers={["仓库", "物料编码", "物料名称", "当前库存", "安全库存", "状态", "最近变动"]}
            rows={balances.map((balance) => [
              balance.warehouseCode,
              balance.materialCode,
              balance.materialName,
              `${balance.currentQuantity} ${balance.unit}`,
              balance.safeStock ?? "-",
              <InventoryStockBadge key={`${balance.warehouseId}-${balance.materialId}`} low={balance.isLowStock} />,
              balance.lastMovementAt ?? "-",
            ])}
          />
        )}
      </SectionCard> : null}
    </section>
  );
}

function ResponsiveTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateMessage({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="party-state">
      {icon}
      {text}
    </div>
  );
}

function InventoryStockBadge({ low }: { low: boolean }) {
  return <StatusBadge tone={low ? "danger" : "success"}>{low ? "低库存" : "正常"}</StatusBadge>;
}
