import { ClipboardList, Filter, PackageCheck, RefreshCw, Save, Search, Warehouse } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_SOURCE_TYPES,
  type CreateInventoryMovementInput,
  type EmployeeDto,
  type InventoryBalanceDto,
  type InventoryMovementDto,
  type InventoryMovementTypeCode,
  type MaterialDto,
  type WarehouseDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, requestJson } from "../apiClient";
import { DataTable, DetailDrawer, EmptyState, FormDrawer, ListPaginationBar, SectionCard, SegmentedTabs, StatusBadge, SummaryCard, Toolbar, WorkspaceScaffold } from "./ui";
import { inventoryRiskToBadge } from "./statusMappers";

const INVENTORY_LEDGER_PAGE_SIZE = 20;

type InventoryMovementsQuery = {
  movementType?: InventoryMovementTypeCode;
  q?: string;
  limit: number;
  offset: number;
};
type InventoryMovementsPage = { rows: InventoryMovementDto[]; total: number };
type MovementSummary = { totalCount: number; inboundQuantity: number };

type InventoryWorkspaceProps = {
  loadInventoryMovements?: () => Promise<InventoryMovementDto[]>;
  loadInventoryMovementsPage?: (query: InventoryMovementsQuery) => Promise<InventoryMovementsPage>;
  loadInventoryMovementSummary?: () => Promise<MovementSummary>;
  loadInventoryBalances?: () => Promise<InventoryBalanceDto[]>;
  createInventoryMovement?: (input: CreateInventoryMovementInput) => Promise<InventoryMovementDto>;
  loadMaterials?: () => Promise<MaterialDto[]>;
  loadWarehouses?: () => Promise<WarehouseDto[]>;
  loadEmployees?: () => Promise<EmployeeDto[]>;
  canManage?: boolean;
  showBalances?: boolean;
  initialTab?: string;
  initialEntityId?: string;
};

type MovementFormState = {
  movementDate: string;
  movementType: Extract<InventoryMovementTypeCode, "opening" | "inbound" | "outbound" | "adjustment_in" | "adjustment_out">;
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
type InventoryTab = "risk" | "balances" | "inbound" | "outbound" | "movements" | "replenishment";

const inventoryTabs: { key: InventoryTab; label: string }[] = [
  { key: "risk", label: "库存风险" },
  { key: "balances", label: "当前库存" },
  { key: "inbound", label: "入库流水" },
  { key: "outbound", label: "出库流水" },
  { key: "movements", label: "库存流水" },
  { key: "replenishment", label: "补货建议" },
];

function isInventoryTab(value: string | undefined): value is InventoryTab {
  return inventoryTabs.some((tab) => tab.key === value);
}

const movementTypeLabel = new Map(INVENTORY_MOVEMENT_TYPES.map((movementType) => [movementType.code, movementType.label]));
const sourceTypeLabel = new Map(INVENTORY_SOURCE_TYPES.map((sourceType) => [sourceType.code, sourceType.label]));
const creatableMovementTypes = INVENTORY_MOVEMENT_TYPES.filter((movementType) =>
  ["opening", "inbound", "outbound", "adjustment_in", "adjustment_out"].includes(movementType.code),
);

async function defaultLoadInventoryMovements(): Promise<InventoryMovementDto[]> {
  const payload = await requestJson<{ inventoryMovements: InventoryMovementDto[] }>(
    `${apiBaseUrl}/api/inventory-movements`,
  );
  return payload.inventoryMovements;
}

async function defaultLoadInventoryMovementsPage(query: InventoryMovementsQuery): Promise<InventoryMovementsPage> {
  const params = new URLSearchParams();
  if (query.movementType) params.set("movementType", query.movementType);
  if (query.q) params.set("q", query.q);
  params.set("limit", String(query.limit));
  params.set("offset", String(query.offset));
  const payload = await requestJson<{ inventoryMovements: InventoryMovementDto[]; total?: number }>(
    `${apiBaseUrl}/api/inventory-movements?${params.toString()}`,
  );
  return { rows: payload.inventoryMovements, total: payload.total ?? payload.inventoryMovements.length };
}

async function defaultLoadInventoryMovementSummary(): Promise<MovementSummary> {
  const payload = await requestJson<{ inventoryMovementSummary?: MovementSummary }>(
    `${apiBaseUrl}/api/inventory-movements/summary`,
  );
  return payload.inventoryMovementSummary ?? { totalCount: 0, inboundQuantity: 0 };
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

async function defaultLoadEmployees(): Promise<EmployeeDto[]> {
  const payload = await requestJson<{ employees: EmployeeDto[] }>(`${apiBaseUrl}/api/employees?employmentStatus=active`);
  return payload.employees;
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
  loadInventoryMovementsPage = defaultLoadInventoryMovementsPage,
  loadInventoryMovementSummary = defaultLoadInventoryMovementSummary,
  loadInventoryBalances = defaultLoadInventoryBalances,
  createInventoryMovement = defaultCreateInventoryMovement,
  loadMaterials = defaultLoadMaterials,
  loadWarehouses = defaultLoadWarehouses,
  loadEmployees = defaultLoadEmployees,
  canManage = true,
  showBalances = true,
  initialTab,
  initialEntityId,
}: InventoryWorkspaceProps) {
  const [movements, setMovements] = useState<InventoryMovementDto[]>([]);
  const [balances, setBalances] = useState<InventoryBalanceDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [movementStatus, setMovementStatus] = useState<"loading" | "ready" | "error">("loading");
  const [balanceStatus, setBalanceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [movementFilter, setMovementFilter] = useState<"all" | InventoryMovementTypeCode>("all");
  const [selectedMovementId, setSelectedMovementId] = useState("");
  const [selectedBalanceKey, setSelectedBalanceKey] = useState("");
  const [activeTab, setActiveTab] = useState<InventoryTab>(isInventoryTab(initialTab) ? initialTab : "risk");
  const [movementDrawerOpen, setMovementDrawerOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<MovementFormState>({
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

  // 库存流水（ledger）真翻页：独立分页源，与入库/出库标签页的封顶 movements 数组解耦。
  const [ledgerRows, setLedgerRows] = useState<InventoryMovementDto[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerPageSize, setLedgerPageSize] = useState(INVENTORY_LEDGER_PAGE_SIZE);
  const [ledgerStatus, setLedgerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ledgerRefetching, setLedgerRefetching] = useState(false);
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [debouncedLedgerQuery, setDebouncedLedgerQuery] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<"all" | InventoryMovementTypeCode>("all");
  const ledgerLoadedRef = useRef(false);
  const [movementSummary, setMovementSummary] = useState<MovementSummary>({ totalCount: 0, inboundQuantity: 0 });
  const [summaryRefresh, setSummaryRefresh] = useState(0);

  useEffect(() => {
    if (isInventoryTab(initialTab)) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialEntityId && activeTab === "movements") {
      setSelectedMovementId(initialEntityId);
    }
  }, [initialEntityId, activeTab]);

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
    Promise.all([loadMaterials(), loadWarehouses(), loadEmployees()])
      .then(([nextMaterials, nextWarehouses, nextEmployees]) => {
        if (!mounted) return;
        setMaterials(nextMaterials);
        setWarehouses(nextWarehouses);
        setEmployees(nextEmployees.filter((employee) => employee.employmentStatus === "active"));
        setMasterStatus("ready");
        setForm((current) => ({
          ...current,
          materialId: current.materialId || nextMaterials[0]?.id || "",
          warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
          unit: current.unit || nextMaterials[0]?.baseUnit || "",
          handledBy: current.handledBy || nextEmployees.find((employee) => employee.employmentStatus === "active")?.name || "",
        }));
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadEmployees, loadMaterials, loadWarehouses]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLedgerQuery(ledgerQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [ledgerQuery]);

  useEffect(() => {
    let mounted = true;
    loadInventoryMovementSummary()
      .then((summary) => {
        if (mounted && summary) setMovementSummary(summary);
      })
      .catch(() => {
        /* 摘要卡片为参考信息，加载失败时保留默认值，不打断主流程 */
      });
    return () => {
      mounted = false;
    };
  }, [loadInventoryMovementSummary, summaryRefresh]);

  useEffect(() => {
    if (activeTab !== "movements") return undefined;
    let mounted = true;
    if (ledgerLoadedRef.current) setLedgerRefetching(true);
    else setLedgerStatus("loading");
    loadInventoryMovementsPage({
      movementType: ledgerFilter === "all" ? undefined : ledgerFilter,
      q: debouncedLedgerQuery || undefined,
      limit: ledgerPageSize,
      offset: ledgerOffset,
    })
      .then((page) => {
        if (!mounted) return;
        setLedgerRows(page.rows);
        setLedgerTotal(page.total);
        ledgerLoadedRef.current = true;
        setLedgerRefetching(false);
        setLedgerStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setLedgerRefetching(false);
        setLedgerStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [activeTab, loadInventoryMovementsPage, ledgerFilter, debouncedLedgerQuery, ledgerOffset, ledgerPageSize]);

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
          movement.id,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesType && matchesQuery;
    });
  }, [movementFilter, movements, query]);

  const lowStockCount = balances.filter((balance) => balance.isLowStock).length;
  const activeTabMovements = filteredMovements.filter((movement) => {
    if (activeTab === "inbound") return movement.movementType === "inbound" || movement.movementType === "opening" || movement.movementType === "adjustment_in";
    if (activeTab === "outbound") return movement.movementType === "outbound" || movement.movementType === "adjustment_out";
    return true;  // movements tab: show all
  });
  const movementsEntityNotVisible = Boolean(
    initialEntityId && activeTab === "movements" && movementStatus === "ready" && !movements.find((m) => m.id === initialEntityId)
  );
  const selectedMovement =
    ledgerRows.find((movement) => movement.id === selectedMovementId) ??
    movements.find((movement) => movement.id === selectedMovementId) ??
    null;
  const selectedBalance =
    balances.find((balance) => `${balance.warehouseId}:${balance.materialId}` === selectedBalanceKey) ?? null;
  const isOutboundMovement = form.movementType === "outbound" || form.movementType === "adjustment_out";
  const quantityLabel = isOutboundMovement ? "出库数量" : "入库数量";

  const ledgerPage = Math.floor(ledgerOffset / ledgerPageSize) + 1;
  const ledgerPageCount = Math.max(1, Math.ceil(ledgerTotal / ledgerPageSize));
  const canPrevLedger = ledgerOffset > 0;
  const canNextLedger = ledgerOffset + ledgerPageSize < ledgerTotal;
  const ledgerSearchActive = ledgerFilter !== "all" || debouncedLedgerQuery.length > 0;

  function changeLedgerFilter(value: "all" | InventoryMovementTypeCode) {
    setLedgerFilter(value);
    setLedgerOffset(0);
  }
  function changeLedgerQuery(value: string) {
    setLedgerQuery(value);
    setLedgerOffset(0);
  }
  function goToPrevLedgerPage() {
    setLedgerOffset((offset) => Math.max(0, offset - ledgerPageSize));
  }
  function goToNextLedgerPage() {
    setLedgerOffset((offset) => offset + ledgerPageSize);
  }
  function goToLedgerPage(page: number) {
    const clamped = Math.min(Math.max(1, page), ledgerPageCount);
    setLedgerOffset((clamped - 1) * ledgerPageSize);
  }
  function changeLedgerPageSize(size: number) {
    setLedgerPageSize(size);
    setLedgerOffset(0);
  }

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
    setSubmitError("");

    try {
      if (form.quantity && !Number.isInteger(Number(form.quantity))) {
        setSubmitError("数量必须为整数。");
        setSubmitState("error");
        return;
      }
      const created = await createInventoryMovement({
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
      setSummaryRefresh((value) => value + 1);
      if (showBalances) {
        setBalances(await loadInventoryBalances());
      }
      setForm((current) => ({
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
        handledBy: current.handledBy,
        remark: "",
      }));
      setSubmitState("idle");
      setMovementDrawerOpen(false);
    } catch (error) {
      setSubmitError(formatApiError(error, "入库登记失败，请检查必填项或单号是否重复。"));
      setSubmitState("error");
    }
  }

  return (
    <WorkspaceScaffold
        eyebrow="库存风险与流水"
        title="库存管理"
        subtitle="默认查看库存风险；入库、出库和当前库存分区处理。"
        actions={(
          <span className="parties-total">
            <Warehouse aria-hidden="true" size={18} />
            {balances.length} 个库存项
          </span>
        )}
        summary={(
          <div className="summary-grid compact-summary" aria-label="库存指标摘要">
            <SummaryCard label="库存流水" value={movementSummary.totalCount} detail="最近出入库记录" tone="info" />
            <SummaryCard label="当前库存项" value={balances.length} detail={showBalances ? "按仓库和物料汇总" : "无权限查看余额"} tone={showBalances ? "neutral" : "disabled"} />
            <SummaryCard label="低库存" value={lowStockCount} detail="低于安全库存" tone={lowStockCount > 0 ? "danger" : "success"} />
            <SummaryCard label="本轮入库数量" value={movementSummary.inboundQuantity} detail="入库流水合计" tone="success" />
          </div>
        )}
        tabs={(
          <>
            <SegmentedTabs items={inventoryTabs.filter((tab) => showBalances || tab.key !== "balances")} activeKey={activeTab} onChange={setActiveTab} ariaLabel="库存分区" />
            {canManage && (activeTab === "inbound" || activeTab === "outbound") ? (
              <div className="workspace-primary-actions">
                <button
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      movementType: activeTab === "outbound" ? "outbound" : "inbound",
                      sourceType: activeTab === "outbound" ? "other" : "purchase",
                    }));
                    setMovementDrawerOpen(true);
                  }}
                >
                  {activeTab === "outbound" ? "新增出库流水" : "新增入库流水"}
                </button>
              </div>
            ) : null}
          </>
        )}
      >
      {activeTab === "risk" ? (
        <SectionCard title="库存风险" action={<Warehouse aria-hidden="true" size={16} />}>
          {balanceStatus === "loading" ? <StateMessage icon={<RefreshCw size={16} />} text="库存风险加载中" /> : null}
          {balanceStatus === "error" ? <StateMessage icon={<Warehouse size={16} />} text="库存风险接口暂不可用" /> : null}
          {balanceStatus === "ready" && balances.filter((balance) => balance.isLowStock).length === 0 ? <EmptyState title="暂无低库存风险" /> : null}
          {balanceStatus === "ready" && balances.filter((balance) => balance.isLowStock).length > 0 ? (
            <DataTable
              headers={["仓库", "物料编码", "物料名称", "当前库存", "安全库存", "状态"]}
              rows={balances.filter((balance) => balance.isLowStock).map((balance) => [
                balance.warehouseCode,
                balance.materialCode,
                balance.materialName,
                `${balance.currentQuantity} ${balance.unit}`,
                balance.safeStock ?? "-",
                <InventoryStockBadge key={`${balance.warehouseId}-${balance.materialId}`} low={balance.isLowStock} />,
              ])}
              onRowClick={(rowIndex) => {
                const balance = balances.filter((item) => item.isLowStock)[rowIndex];
                setSelectedBalanceKey(balance ? `${balance.warehouseId}:${balance.materialId}` : "");
              }}
            />
          ) : null}
        </SectionCard>
      ) : null}

      {(activeTab === "inbound" || activeTab === "outbound") ? (
        <SectionCard title={activeTab === "outbound" ? "出库流水" : "入库流水"} action={<ClipboardList aria-hidden="true" size={16} />}>
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
          ) : activeTabMovements.length === 0 ? (
            <StateMessage icon={<PackageCheck size={16} />} text="暂无库存流水" />
          ) : (
            <DataTable
              headers={["单号", "日期", "类型", "仓库", "物料", "数量", "处理摘要"]}
              rows={activeTabMovements.map((movement) => [
                movement.movementNo,
                movement.movementDate,
                movementTypeLabel.get(movement.movementType) ?? movement.movementType,
                movement.warehouseCode,
                `${movement.materialCode} ${movement.materialName}`,
                `${movement.quantity} ${movement.unit}`,
                <span key={movement.id} className="table-cell-stack">
                  <strong>{movement.sourceType ? sourceTypeLabel.get(movement.sourceType) ?? movement.sourceType : "未指定来源"}</strong>
                  <small>{movement.handledBy ?? "未记录经办人"}</small>
                </span>,
              ])}
              onRowClick={(rowIndex) => setSelectedMovementId(activeTabMovements[rowIndex]?.id ?? "")}
            />
          )}
        </SectionCard>
      ) : null}

      <FormDrawer
        title={isOutboundMovement ? "新增出库流水" : "新增入库流水"}
        open={movementDrawerOpen}
        dirty={Boolean(form.quantity || form.purchaseRecordNo || form.purchaseRecordLineId || form.remark)}
        onClose={() => setMovementDrawerOpen(false)}
      >
        {canManage ? <form className="dashboard-panel workspace-form" onSubmit={handleSubmit} aria-label="库存出入库登记表单" noValidate>
          <div className="panel-header people-panel-title">
            <h3>
              <PackageCheck aria-hidden="true" size={16} />
              库存出入库登记
            </h3>
            <button type="submit" disabled={submitState === "saving" || masterStatus !== "ready" || employees.length === 0}>
              <Save aria-hidden="true" size={15} />
              {submitState === "saving" ? "保存中" : "保存"}
            </button>
          </div>
          <label>
            <span>{isOutboundMovement ? "出库日期" : "入库日期"}</span>
            <input
              placeholder="年-月-日，例如 2026-05-20"
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
              <span>{quantityLabel}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
              />
            </label>
            <label>
              <span>单位</span>
              <input value={form.unit} readOnly aria-readonly="true" />
            </label>
            <label>
              <span>流水类型</span>
              <select
                value={form.movementType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    movementType: event.target.value as MovementFormState["movementType"],
                    sourceType: event.target.value === "outbound" || event.target.value === "adjustment_out" ? "other" : form.sourceType,
                  })
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
            <select value={form.handledBy} onChange={(event) => setForm({ ...form, handledBy: event.target.value })}>
              <option value="">选择总部员工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.name}>
                  {employee.employeeNo} {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>备注</span>
            <input
              value={form.remark}
              placeholder={isOutboundMovement ? "例如：去参观某项目点" : ""}
              onChange={(event) => setForm({ ...form, remark: event.target.value })}
            />
          </label>
          {masterStatus === "error" ? <p className="form-error">物料、仓库或员工接口暂不可用，暂不能登记出入库。</p> : null}
          {masterStatus === "ready" && employees.length === 0 ? <p className="form-error">缺少在职总部员工，暂不能登记出入库。</p> : null}
          {submitState === "error" ? <p className="form-error">{submitError || "入库登记失败，请检查必填项或单号是否重复。"}</p> : null}
        </form> : null}
      </FormDrawer>

      {activeTab === "balances" && showBalances ? <SectionCard title="当前库存查询" action={<Warehouse aria-hidden="true" size={16} />}>
        {balanceStatus === "loading" ? (
          <StateMessage icon={<RefreshCw size={16} />} text="当前库存加载中" />
        ) : balanceStatus === "error" ? (
          <StateMessage icon={<Warehouse size={16} />} text="当前库存接口暂不可用" />
        ) : balances.length === 0 ? (
          <StateMessage icon={<Warehouse size={16} />} text="暂无当前库存" />
        ) : (
          <DataTable
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
            onRowClick={(rowIndex) => {
              const balance = balances[rowIndex];
              setSelectedBalanceKey(balance ? `${balance.warehouseId}:${balance.materialId}` : "");
            }}
          />
        )}
      </SectionCard> : null}

      {activeTab === "movements" ? (
        <SectionCard title="库存流水" action={<ClipboardList aria-hidden="true" size={16} />}>
          {movementsEntityNotVisible ? (
            <div className="workspace-state workspace-state--info" role="status">
              <span>库存流水记录不可见或无权限，请搜索单号核查。记录 ID：{initialEntityId}</span>
            </div>
          ) : null}
          <Toolbar
            search={(
              <label className="table-search">
              <Search aria-hidden="true" size={16} />
              <input
                value={ledgerQuery}
                onChange={(event) => changeLedgerQuery(event.target.value)}
                placeholder="搜索单号、物料、仓库、经办人"
              />
              </label>
            )}
            filters={(
              <label className="table-filter">
              <Filter aria-hidden="true" size={16} />
              <select
                aria-label="库存流水类型筛选"
                value={ledgerFilter}
                onChange={(event) => changeLedgerFilter(event.target.value as "all" | InventoryMovementTypeCode)}
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
          {ledgerStatus === "loading" ? (
            <StateMessage icon={<RefreshCw size={16} />} text="库存流水加载中" />
          ) : ledgerStatus === "error" ? (
            <StateMessage icon={<PackageCheck size={16} />} text="库存流水接口暂不可用" />
          ) : ledgerTotal === 0 ? (
            <StateMessage icon={<PackageCheck size={16} />} text={ledgerSearchActive ? "未找到匹配的库存流水" : "暂无库存流水"} />
          ) : (
            <>
              <div className={ledgerRefetching ? "workspace-list-refetching" : undefined}>
                <DataTable
                  headers={["单号", "日期", "类型", "仓库", "物料", "数量", "处理摘要"]}
                  rows={ledgerRows.map((movement) => [
                    movement.movementNo,
                    movement.movementDate,
                    movementTypeLabel.get(movement.movementType) ?? movement.movementType,
                    movement.warehouseCode,
                    `${movement.materialCode} ${movement.materialName}`,
                    `${movement.quantity} ${movement.unit}`,
                    <span key={movement.id} className="table-cell-stack">
                      <strong>{movement.sourceType ? sourceTypeLabel.get(movement.sourceType) ?? movement.sourceType : "未指定来源"}</strong>
                      <small>{movement.handledBy ?? "未记录经办人"}</small>
                    </span>,
                  ])}
                  onRowClick={(rowIndex) => setSelectedMovementId(ledgerRows[rowIndex]?.id ?? "")}
                />
              </div>
              <ListPaginationBar
                total={ledgerTotal}
                page={ledgerPage}
                pageCount={ledgerPageCount}
                pageSize={ledgerPageSize}
                refetching={ledgerRefetching}
                canPrev={canPrevLedger}
                canNext={canNextLedger}
                onPrev={goToPrevLedgerPage}
                onNext={goToNextLedgerPage}
                onJump={goToLedgerPage}
                onPageSizeChange={changeLedgerPageSize}
              />
            </>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "replenishment" ? (
        <EmptyState title="暂无补货建议" description="当前低库存风险会在库存风险分区展示；补货建议稳定接口开放后在此处理。" />
      ) : null}

      <DetailDrawer
        title="库存流水详情"
        open={Boolean(selectedMovement)}
        onClose={() => setSelectedMovementId("")}
      >
        {selectedMovement ? <InventoryMovementDetail movement={selectedMovement} /> : null}
      </DetailDrawer>

      <DetailDrawer
        title="库存余额详情"
        open={Boolean(selectedBalance)}
        onClose={() => setSelectedBalanceKey("")}
      >
        {selectedBalance ? <InventoryBalanceDetail balance={selectedBalance} /> : null}
      </DetailDrawer>
    </WorkspaceScaffold>
  );
}

function StateMessage({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="workspace-state">
      {icon}
      {text}
    </div>
  );
}

function InventoryStockBadge({ low }: { low: boolean }) {
  const badge = inventoryRiskToBadge(low);
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

function InventoryMovementDetail({ movement }: { movement: InventoryMovementDto }) {
  return (
    <dl className="detail-grid">
      <dt>流水单号</dt>
      <dd>{movement.movementNo}</dd>
      <dt>日期</dt>
      <dd>{movement.movementDate}</dd>
      <dt>类型</dt>
      <dd>{movementTypeLabel.get(movement.movementType) ?? movement.movementType}</dd>
      <dt>仓库</dt>
      <dd>{movement.warehouseCode} {movement.warehouseName}</dd>
      <dt>物料</dt>
      <dd>{movement.materialCode} {movement.materialName}</dd>
      <dt>数量</dt>
      <dd>{movement.quantity} {movement.unit}</dd>
      <dt>来源</dt>
      <dd>{movement.sourceType ? sourceTypeLabel.get(movement.sourceType) ?? movement.sourceType : "-"}</dd>
      <dt>经办人</dt>
      <dd>{movement.handledBy ?? "-"}</dd>
      <dt>备注</dt>
      <dd>{movement.remark ?? "-"}</dd>
    </dl>
  );
}

function InventoryBalanceDetail({ balance }: { balance: InventoryBalanceDto }) {
  return (
    <dl className="detail-grid">
      <dt>仓库</dt>
      <dd>{balance.warehouseCode} {balance.warehouseName}</dd>
      <dt>物料编码</dt>
      <dd>{balance.materialCode}</dd>
      <dt>物料名称</dt>
      <dd>{balance.materialName}</dd>
      <dt>当前库存</dt>
      <dd>{balance.currentQuantity} {balance.unit}</dd>
      <dt>安全库存</dt>
      <dd>{balance.safeStock ?? "-"}</dd>
      <dt>状态</dt>
      <dd><InventoryStockBadge low={balance.isLowStock} /></dd>
      <dt>最近变动</dt>
      <dd>{balance.lastMovementAt ?? "-"}</dd>
    </dl>
  );
}
