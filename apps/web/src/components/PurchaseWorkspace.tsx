import { ClipboardList, Filter, PackageCheck, RefreshCw, Save, Search, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PURCHASE_RECORD_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_SOURCE_TYPES,
  type CreatePurchaseRecordInput,
  type CreatePurchaseRequestInput,
  type PurchaseRecordDto,
  type PurchaseRecordStatusCode,
  type PurchaseRequestDto,
  type PurchaseRequestStatusCode,
  type PurchaseSourceTypeCode,
} from "@company-erp/shared";

type PurchaseWorkspaceProps = {
  loadPurchaseRequests?: () => Promise<PurchaseRequestDto[]>;
  loadPurchaseRecords?: () => Promise<PurchaseRecordDto[]>;
  createPurchaseRequest?: (input: CreatePurchaseRequestInput) => Promise<PurchaseRequestDto>;
  createPurchaseRecord?: (input: CreatePurchaseRecordInput) => Promise<PurchaseRecordDto>;
};

type RequestFormState = {
  requestNo: string;
  requesterName: string;
  departmentName: string;
  materialName: string;
  requestedQuantity: string;
  unit: string;
  expectedArrivalDate: string;
};

type RecordFormState = {
  purchaseNo: string;
  purchaserName: string;
  sourceType: PurchaseSourceTypeCode;
  purchasePlatform: string;
  supplierNameText: string;
  purchaseDescription: string;
  purchaseDate: string;
  materialName: string;
  purchaseQuantity: string;
  unit: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const requestStatusLabel = new Map(PURCHASE_REQUEST_STATUSES.map((status) => [status.code, status.label]));
const recordStatusLabel = new Map(PURCHASE_RECORD_STATUSES.map((status) => [status.code, status.label]));
const sourceTypeLabel = new Map(PURCHASE_SOURCE_TYPES.map((sourceType) => [sourceType.code, sourceType.label]));

async function defaultLoadPurchaseRequests(): Promise<PurchaseRequestDto[]> {
  const response = await fetch(`${apiBaseUrl}/api/purchase-requests`);
  if (!response.ok) throw new Error(`Purchase requests failed with ${response.status}`);
  const payload = (await response.json()) as { purchaseRequests: PurchaseRequestDto[] };
  return payload.purchaseRequests;
}

async function defaultLoadPurchaseRecords(): Promise<PurchaseRecordDto[]> {
  const response = await fetch(`${apiBaseUrl}/api/purchase-records`);
  if (!response.ok) throw new Error(`Purchase records failed with ${response.status}`);
  const payload = (await response.json()) as { purchaseRecords: PurchaseRecordDto[] };
  return payload.purchaseRecords;
}

async function defaultCreatePurchaseRequest(input: CreatePurchaseRequestInput): Promise<PurchaseRequestDto> {
  const response = await fetch(`${apiBaseUrl}/api/purchase-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Purchase request create failed with ${response.status}`);
  const payload = (await response.json()) as { purchaseRequest: PurchaseRequestDto };
  return payload.purchaseRequest;
}

async function defaultCreatePurchaseRecord(input: CreatePurchaseRecordInput): Promise<PurchaseRecordDto> {
  const response = await fetch(`${apiBaseUrl}/api/purchase-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Purchase record create failed with ${response.status}`);
  const payload = (await response.json()) as { purchaseRecord: PurchaseRecordDto };
  return payload.purchaseRecord;
}

export function PurchaseWorkspace({
  loadPurchaseRequests = defaultLoadPurchaseRequests,
  loadPurchaseRecords = defaultLoadPurchaseRecords,
  createPurchaseRequest = defaultCreatePurchaseRequest,
  createPurchaseRecord = defaultCreatePurchaseRecord,
}: PurchaseWorkspaceProps) {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecordDto[]>([]);
  const [requestStatus, setRequestStatus] = useState<"loading" | "ready" | "error">("loading");
  const [recordStatus, setRecordStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestQuery, setRequestQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState<"all" | PurchaseRequestStatusCode>("all");
  const [recordFilter, setRecordFilter] = useState<"all" | PurchaseRecordStatusCode>("all");
  const [requestSubmitState, setRequestSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [recordSubmitState, setRecordSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    requestNo: "",
    requesterName: "",
    departmentName: "",
    materialName: "",
    requestedQuantity: "",
    unit: "",
    expectedArrivalDate: "",
  });
  const [recordForm, setRecordForm] = useState<RecordFormState>({
    purchaseNo: "",
    purchaserName: "",
    sourceType: "platform",
    purchasePlatform: "",
    supplierNameText: "",
    purchaseDescription: "",
    purchaseDate: "",
    materialName: "",
    purchaseQuantity: "",
    unit: "",
  });

  useEffect(() => {
    let mounted = true;
    setRequestStatus("loading");
    loadPurchaseRequests()
      .then((nextRequests) => {
        if (!mounted) return;
        setPurchaseRequests(nextRequests);
        setRequestStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setRequestStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadPurchaseRequests]);

  useEffect(() => {
    let mounted = true;
    setRecordStatus("loading");
    loadPurchaseRecords()
      .then((nextRecords) => {
        if (!mounted) return;
        setPurchaseRecords(nextRecords);
        setRecordStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setRecordStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadPurchaseRecords]);

  const filteredRequests = useMemo(() => {
    const query = requestQuery.trim().toLowerCase();
    return purchaseRequests.filter((request) => {
      const matchesStatus = requestFilter === "all" || request.status === requestFilter;
      const matchesQuery =
        query.length === 0 ||
        [request.requestNo, request.requesterName, request.departmentName, request.projectSiteName, request.lines[0]?.materialName]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [purchaseRequests, requestFilter, requestQuery]);

  const filteredRecords = useMemo(() => {
    const query = recordQuery.trim().toLowerCase();
    return purchaseRecords.filter((record) => {
      const matchesStatus = recordFilter === "all" || record.status === recordFilter;
      const matchesQuery =
        query.length === 0 ||
        [
          record.purchaseNo,
          record.purchaserName,
          record.purchasePlatform,
          record.shopName,
          record.supplierPartyName,
          record.supplierNameText,
          record.lines[0]?.materialName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [purchaseRecords, recordFilter, recordQuery]);

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestSubmitState("saving");

    try {
      const created = await createPurchaseRequest({
        requestNo: requestForm.requestNo,
        requesterName: requestForm.requesterName,
        departmentName: requestForm.departmentName,
        expectedArrivalDate: requestForm.expectedArrivalDate || null,
        lines: [
          {
            materialName: requestForm.materialName,
            requestedQuantity: Number(requestForm.requestedQuantity),
            unit: requestForm.unit,
          },
        ],
      });
      setPurchaseRequests((current) => [created, ...current.filter((request) => request.id !== created.id)]);
      setRequestForm({
        requestNo: "",
        requesterName: "",
        departmentName: "",
        materialName: "",
        requestedQuantity: "",
        unit: "",
        expectedArrivalDate: "",
      });
      setRequestSubmitState("idle");
    } catch {
      setRequestSubmitState("error");
    }
  }

  async function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecordSubmitState("saving");

    try {
      const created = await createPurchaseRecord({
        purchaseNo: recordForm.purchaseNo,
        purchaserName: recordForm.purchaserName,
        sourceType: recordForm.sourceType,
        purchasePlatform: recordForm.purchasePlatform || null,
        supplierNameText: recordForm.supplierNameText || null,
        purchaseDescription: recordForm.purchaseDescription || null,
        purchaseDate: recordForm.purchaseDate,
        lines: [
          {
            materialName: recordForm.materialName,
            purchaseQuantity: Number(recordForm.purchaseQuantity),
            unit: recordForm.unit,
          },
        ],
      });
      setPurchaseRecords((current) => [created, ...current.filter((record) => record.id !== created.id)]);
      setRecordForm({
        purchaseNo: "",
        purchaserName: "",
        sourceType: "platform",
        purchasePlatform: "",
        supplierNameText: "",
        purchaseDescription: "",
        purchaseDate: "",
        materialName: "",
        purchaseQuantity: "",
        unit: "",
      });
      setRecordSubmitState("idle");
    } catch {
      setRecordSubmitState("error");
    }
  }

  return (
    <section className="purchase-workspace" aria-label="采购管理">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">采购</span>
          <h2>采购管理</h2>
          <p>登记采购需求和采购执行记录，供应商资料可选，入库后续模块处理。</p>
        </div>
        <span className="parties-total">
          <ShoppingCart aria-hidden="true" size={18} />
          {purchaseRequests.length + purchaseRecords.length} 条采购数据
        </span>
      </div>

      <div className="party-summary material-summary" aria-label="采购摘要指标">
        <SummaryCard label="采购需求" value={purchaseRequests.length} />
        <SummaryCard label="待采购" value={purchaseRequests.filter((request) => request.status === "pending_purchase").length} />
        <SummaryCard label="采购记录" value={purchaseRecords.length} />
        <SummaryCard label="已下单" value={purchaseRecords.filter((record) => record.status === "ordered").length} />
        <SummaryCard label="未建供应商" value={purchaseRecords.filter((record) => !record.supplierPartyId).length} />
      </div>

      <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <div className="panel-header people-panel-title">
            <h3>
              <ClipboardList aria-hidden="true" size={17} />
              采购需求
            </h3>
          </div>
          <Toolbar
            query={requestQuery}
            onQueryChange={setRequestQuery}
            filter={requestFilter}
            onFilterChange={(value) => setRequestFilter(value as "all" | PurchaseRequestStatusCode)}
            options={PURCHASE_REQUEST_STATUSES}
            searchLabel="搜索采购需求"
          />
          {requestStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载采购需求..." /> : null}
          {requestStatus === "error" ? <StateMessage text="采购需求加载失败" /> : null}
          {requestStatus === "ready" && filteredRequests.length === 0 ? <StateMessage text="暂无采购需求" /> : null}
          {requestStatus === "ready" && filteredRequests.length > 0 ? <PurchaseRequestsTable requests={filteredRequests} /> : null}
        </section>

        <form className="dashboard-panel party-form" onSubmit={handleRequestSubmit}>
          <div className="panel-header">
            <h3>新增采购需求</h3>
            <button type="submit" disabled={requestSubmitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存采购需求
            </button>
          </div>
          <label>
            <span>采购需求编号</span>
            <input required value={requestForm.requestNo} onChange={(event) => setRequestForm((current) => ({ ...current, requestNo: event.target.value }))} />
          </label>
          <label>
            <span>申请人</span>
            <input required value={requestForm.requesterName} onChange={(event) => setRequestForm((current) => ({ ...current, requesterName: event.target.value }))} />
          </label>
          <label>
            <span>申请部门</span>
            <input required value={requestForm.departmentName} onChange={(event) => setRequestForm((current) => ({ ...current, departmentName: event.target.value }))} />
          </label>
          <label>
            <span>需求物料名称</span>
            <input required value={requestForm.materialName} onChange={(event) => setRequestForm((current) => ({ ...current, materialName: event.target.value }))} />
          </label>
          <label>
            <span>需求数量</span>
            <input required type="number" min="0.001" step="0.001" value={requestForm.requestedQuantity} onChange={(event) => setRequestForm((current) => ({ ...current, requestedQuantity: event.target.value }))} />
          </label>
          <label>
            <span>需求单位</span>
            <input required value={requestForm.unit} onChange={(event) => setRequestForm((current) => ({ ...current, unit: event.target.value }))} />
          </label>
          <label>
            <span>期望到货日期</span>
            <input type="date" value={requestForm.expectedArrivalDate} onChange={(event) => setRequestForm((current) => ({ ...current, expectedArrivalDate: event.target.value }))} />
          </label>
          {requestSubmitState === "error" ? <p className="form-error">保存失败，请检查单号是否重复或稍后重试。</p> : null}
        </form>
      </div>

      <div className="people-section-grid">
        <section className="dashboard-panel table-panel">
          <div className="panel-header people-panel-title">
            <h3>
              <PackageCheck aria-hidden="true" size={17} />
              采购记录
            </h3>
          </div>
          <Toolbar
            query={recordQuery}
            onQueryChange={setRecordQuery}
            filter={recordFilter}
            onFilterChange={(value) => setRecordFilter(value as "all" | PurchaseRecordStatusCode)}
            options={PURCHASE_RECORD_STATUSES}
            searchLabel="搜索采购记录"
          />
          {recordStatus === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载采购记录..." /> : null}
          {recordStatus === "error" ? <StateMessage text="采购记录加载失败" /> : null}
          {recordStatus === "ready" && filteredRecords.length === 0 ? <StateMessage text="暂无采购记录" /> : null}
          {recordStatus === "ready" && filteredRecords.length > 0 ? <PurchaseRecordsTable records={filteredRecords} /> : null}
        </section>

        <form className="dashboard-panel party-form" onSubmit={handleRecordSubmit}>
          <div className="panel-header">
            <h3>新增采购记录</h3>
            <button type="submit" disabled={recordSubmitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存采购记录
            </button>
          </div>
          <label>
            <span>采购单号</span>
            <input required value={recordForm.purchaseNo} onChange={(event) => setRecordForm((current) => ({ ...current, purchaseNo: event.target.value }))} />
          </label>
          <label>
            <span>采购人</span>
            <input required value={recordForm.purchaserName} onChange={(event) => setRecordForm((current) => ({ ...current, purchaserName: event.target.value }))} />
          </label>
          <label>
            <span>采购来源</span>
            <select value={recordForm.sourceType} onChange={(event) => setRecordForm((current) => ({ ...current, sourceType: event.target.value as PurchaseSourceTypeCode }))}>
              {PURCHASE_SOURCE_TYPES.map((sourceType) => (
                <option key={sourceType.code} value={sourceType.code}>
                  {sourceType.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>采购平台/渠道</span>
            <input value={recordForm.purchasePlatform} onChange={(event) => setRecordForm((current) => ({ ...current, purchasePlatform: event.target.value }))} />
          </label>
          <label>
            <span>供应商名称辅助</span>
            <input value={recordForm.supplierNameText} onChange={(event) => setRecordForm((current) => ({ ...current, supplierNameText: event.target.value }))} />
          </label>
          <label>
            <span>采购说明</span>
            <input value={recordForm.purchaseDescription} onChange={(event) => setRecordForm((current) => ({ ...current, purchaseDescription: event.target.value }))} />
          </label>
          <label>
            <span>采购日期</span>
            <input required type="date" value={recordForm.purchaseDate} onChange={(event) => setRecordForm((current) => ({ ...current, purchaseDate: event.target.value }))} />
          </label>
          <label>
            <span>采购物料名称</span>
            <input required value={recordForm.materialName} onChange={(event) => setRecordForm((current) => ({ ...current, materialName: event.target.value }))} />
          </label>
          <label>
            <span>采购数量</span>
            <input required type="number" min="0.001" step="0.001" value={recordForm.purchaseQuantity} onChange={(event) => setRecordForm((current) => ({ ...current, purchaseQuantity: event.target.value }))} />
          </label>
          <label>
            <span>采购单位</span>
            <input required value={recordForm.unit} onChange={(event) => setRecordForm((current) => ({ ...current, unit: event.target.value }))} />
          </label>
          {recordSubmitState === "error" ? <p className="form-error">保存失败，请检查单号是否重复或稍后重试。</p> : null}
        </form>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Toolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  options,
  searchLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  options: readonly { code: string; label: string }[];
  searchLabel: string;
}) {
  return (
    <div className="party-toolbar">
      <label className="party-search">
        <Search aria-hidden="true" size={16} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchLabel} />
      </label>
      <label className="party-filter">
        <Filter aria-hidden="true" size={16} />
        <select aria-label={searchLabel} value={filter} onChange={(event) => onFilterChange(event.target.value)}>
          <option value="all">全部状态</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PurchaseRequestsTable({ requests }: { requests: PurchaseRequestDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编号</th>
            <th>申请人</th>
            <th>部门/项目点</th>
            <th>物料</th>
            <th>数量</th>
            <th>状态</th>
            <th>期望到货</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const firstLine = request.lines[0];
            return (
              <tr key={request.id}>
                <td>{request.requestNo}</td>
                <td>{request.requesterName}</td>
                <td>{request.projectSiteName || request.departmentName}</td>
                <td>{firstLine?.materialName ?? "-"}</td>
                <td>{firstLine ? `${firstLine.requestedQuantity} ${firstLine.unit}` : "-"}</td>
                <td>
                  <span className={`status-badge ${request.status === "cancelled" ? "orange" : "blue"}`}>
                    {requestStatusLabel.get(request.status)}
                  </span>
                </td>
                <td>{request.expectedArrivalDate || "-"}</td>
                <td>{formatDateTime(request.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseRecordsTable({ records }: { records: PurchaseRecordDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>采购单号</th>
            <th>采购人</th>
            <th>来源</th>
            <th>供应商/平台/店铺</th>
            <th>物料</th>
            <th>采购数量</th>
            <th>采购日期</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const firstLine = record.lines[0];
            const sourceText = record.supplierPartyName || record.supplierNameText || record.purchasePlatform || record.shopName || record.purchaseDescription || "未建供应商";
            return (
              <tr key={record.id}>
                <td>{record.purchaseNo}</td>
                <td>{record.purchaserName}</td>
                <td>{sourceTypeLabel.get(record.sourceType)}</td>
                <td>{sourceText}</td>
                <td>{firstLine?.materialName ?? "-"}</td>
                <td>{firstLine ? `${firstLine.purchaseQuantity} ${firstLine.unit}` : "-"}</td>
                <td>{record.purchaseDate}</td>
                <td>
                  <span className={`status-badge ${record.status === "cancelled" ? "orange" : "green"}`}>
                    {recordStatusLabel.get(record.status)}
                  </span>
                </td>
              </tr>
            );
          })}
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
