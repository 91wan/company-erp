import { Check, ClipboardList, Filter, PackageCheck, RefreshCw, Save, Search, ShoppingCart, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PURCHASE_RECORD_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_SOURCE_TYPES,
  type ContractDto,
  type CreatePurchaseRecordInput,
  type CreatePurchaseRequestInput,
  type PurchaseRecordDto,
  type PurchaseRecordStatusCode,
  type PurchaseRequestDto,
  type PurchaseRequestStatusCode,
  type PurchaseSourceTypeCode,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, requestJson } from "../apiClient";
import { DetailDrawer, EmptyState, FormDrawer, SectionCard, SegmentedTabs, StatusBadge, SummaryCard, Toolbar as UiToolbar, WorkspaceScaffold } from "./ui";

type PurchaseWorkspaceProps = {
  loadPurchaseRequests?: () => Promise<PurchaseRequestDto[]>;
  loadPurchaseRecords?: () => Promise<PurchaseRecordDto[]>;
  loadContracts?: () => Promise<ContractDto[]>;
  createPurchaseRequest?: (input: CreatePurchaseRequestInput) => Promise<PurchaseRequestDto>;
  createPurchaseRecord?: (input: CreatePurchaseRecordInput) => Promise<PurchaseRecordDto>;
  submitPurchaseRequest?: (id: string) => Promise<PurchaseRequestDto>;
  approvePurchaseRequest?: (id: string, input: PurchaseRequestReviewPayload) => Promise<PurchaseRequestDto>;
  rejectPurchaseRequest?: (id: string, input: PurchaseRequestReviewPayload) => Promise<PurchaseRequestDto>;
  canManage?: boolean;
};

type PurchaseRequestReviewPayload = {
  reviewedByName?: string | null;
  reviewRemark?: string | null;
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
  contractId: string;
  purchaseDate: string;
  materialName: string;
  purchaseQuantity: string;
  unit: string;
};

type PurchaseFormDrawer = "request" | "record" | null;
type PurchaseTab = "todo" | "requests" | "records" | "arrivals";

const purchaseTabs: { key: PurchaseTab; label: string }[] = [
  { key: "todo", label: "待办" },
  { key: "requests", label: "采购需求" },
  { key: "records", label: "采购执行" },
  { key: "arrivals", label: "到货记录" },
];

const requestStatusLabel = new Map(PURCHASE_REQUEST_STATUSES.map((status) => [status.code, status.label]));
const recordStatusLabel = new Map(PURCHASE_RECORD_STATUSES.map((status) => [status.code, status.label]));
const sourceTypeLabel = new Map(PURCHASE_SOURCE_TYPES.map((sourceType) => [sourceType.code, sourceType.label]));
const emptyRequestForm: RequestFormState = {
  requestNo: "",
  requesterName: "",
  departmentName: "",
  materialName: "",
  requestedQuantity: "",
  unit: "",
  expectedArrivalDate: "",
};
const emptyRecordForm: RecordFormState = {
  purchaseNo: "",
  purchaserName: "",
  sourceType: "platform",
  purchasePlatform: "",
  supplierNameText: "",
  purchaseDescription: "",
  contractId: "",
  purchaseDate: "",
  materialName: "",
  purchaseQuantity: "",
  unit: "",
};

async function defaultLoadPurchaseRequests(): Promise<PurchaseRequestDto[]> {
  const payload = await requestJson<{ purchaseRequests: PurchaseRequestDto[] }>(`${apiBaseUrl}/api/purchase-requests`);
  return payload.purchaseRequests;
}

async function defaultLoadPurchaseRecords(): Promise<PurchaseRecordDto[]> {
  const payload = await requestJson<{ purchaseRecords: PurchaseRecordDto[] }>(`${apiBaseUrl}/api/purchase-records`);
  return payload.purchaseRecords;
}

async function defaultLoadContracts(): Promise<ContractDto[]> {
  const payload = await requestJson<{ contracts: ContractDto[] }>(`${apiBaseUrl}/api/contracts`);
  return payload.contracts;
}

async function defaultCreatePurchaseRequest(input: CreatePurchaseRequestInput): Promise<PurchaseRequestDto> {
  const payload = await requestJson<{ purchaseRequest: PurchaseRequestDto }>(`${apiBaseUrl}/api/purchase-requests`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.purchaseRequest;
}

async function defaultCreatePurchaseRecord(input: CreatePurchaseRecordInput): Promise<PurchaseRecordDto> {
  const payload = await requestJson<{ purchaseRecord: PurchaseRecordDto }>(`${apiBaseUrl}/api/purchase-records`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.purchaseRecord;
}

async function defaultSubmitPurchaseRequest(id: string): Promise<PurchaseRequestDto> {
  const payload = await requestJson<{ purchaseRequest: PurchaseRequestDto }>(`${apiBaseUrl}/api/purchase-requests/${id}/submit`, {
    method: "POST",
  });
  return payload.purchaseRequest;
}

async function defaultApprovePurchaseRequest(id: string, input: PurchaseRequestReviewPayload): Promise<PurchaseRequestDto> {
  const payload = await requestJson<{ purchaseRequest: PurchaseRequestDto }>(`${apiBaseUrl}/api/purchase-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.purchaseRequest;
}

async function defaultRejectPurchaseRequest(id: string, input: PurchaseRequestReviewPayload): Promise<PurchaseRequestDto> {
  const payload = await requestJson<{ purchaseRequest: PurchaseRequestDto }>(`${apiBaseUrl}/api/purchase-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.purchaseRequest;
}

export function PurchaseWorkspace({
  loadPurchaseRequests = defaultLoadPurchaseRequests,
  loadPurchaseRecords = defaultLoadPurchaseRecords,
  loadContracts = defaultLoadContracts,
  createPurchaseRequest = defaultCreatePurchaseRequest,
  createPurchaseRecord = defaultCreatePurchaseRecord,
  submitPurchaseRequest = defaultSubmitPurchaseRequest,
  approvePurchaseRequest = defaultApprovePurchaseRequest,
  rejectPurchaseRequest = defaultRejectPurchaseRequest,
  canManage = true,
}: PurchaseWorkspaceProps) {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecordDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [requestStatus, setRequestStatus] = useState<"loading" | "ready" | "error">("loading");
  const [recordStatus, setRecordStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestQuery, setRequestQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState<"all" | PurchaseRequestStatusCode>("all");
  const [recordFilter, setRecordFilter] = useState<"all" | PurchaseRecordStatusCode>("all");
  const [requestSubmitState, setRequestSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [recordSubmitState, setRecordSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [reviewState, setReviewState] = useState<"idle" | "saving" | "error">("idle");
  const [requestSubmitError, setRequestSubmitError] = useState("");
  const [recordSubmitError, setRecordSubmitError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewRemark, setReviewRemark] = useState("");
  const [pendingReviewAction, setPendingReviewAction] = useState<{
    action: "approve" | "reject";
    requestId: string;
  } | null>(null);
  const [openFormDrawer, setOpenFormDrawer] = useState<PurchaseFormDrawer>(null);
  const [activeTab, setActiveTab] = useState<PurchaseTab>("todo");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    ...emptyRequestForm,
  });
  const [recordForm, setRecordForm] = useState<RecordFormState>({
    ...emptyRecordForm,
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

  useEffect(() => {
    let mounted = true;
    loadContracts()
      .then((nextContracts) => {
        if (!mounted) return;
        setContracts(nextContracts);
      })
      .catch(() => {
        if (!mounted) return;
        setContracts([]);
      });
    return () => {
      mounted = false;
    };
  }, [loadContracts]);

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
          record.contractNo,
          record.contractName,
          record.lines[0]?.materialName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [purchaseRecords, recordFilter, recordQuery]);

  const pendingApprovalRequests = useMemo(
    () => purchaseRequests.filter((request) => request.status === "pending_approval"),
    [purchaseRequests],
  );
  const selectedRequest = useMemo(
    () => purchaseRequests.find((request) => request.id === selectedRequestId) ?? null,
    [purchaseRequests, selectedRequestId],
  );
  const selectedRecord = useMemo(
    () => purchaseRecords.find((record) => record.id === selectedRecordId) ?? null,
    [purchaseRecords, selectedRecordId],
  );
  const requestFormDirty = Object.entries(requestForm).some(
    ([key, value]) => value !== emptyRequestForm[key as keyof RequestFormState],
  );
  const recordFormDirty = Object.entries(recordForm).some(
    ([key, value]) => value !== emptyRecordForm[key as keyof RecordFormState],
  );

  function replacePurchaseRequest(nextRequest: PurchaseRequestDto) {
    setPurchaseRequests((current) => current.map((request) => (request.id === nextRequest.id ? nextRequest : request)));
  }

  async function handleRequestReview(action: "submit" | "approve" | "reject", target: PurchaseRequestDto) {
    setReviewState("saving");
    setReviewError("");
    try {
      const payload = { reviewedByName: "", reviewRemark: reviewRemark || null };
      const updated =
        action === "submit"
          ? await submitPurchaseRequest(target.id)
          : action === "approve"
            ? await approvePurchaseRequest(target.id, payload)
            : await rejectPurchaseRequest(target.id, payload);
      replacePurchaseRequest(updated);
      setReviewRemark("");
      setReviewState("idle");
      setPendingReviewAction(null);
    } catch (error) {
      setReviewError(formatApiError(error, "审批操作失败"));
      setReviewState("error");
    }
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestSubmitState("saving");
    setRequestSubmitError("");

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
      setOpenFormDrawer(null);
    } catch (error) {
      setRequestSubmitError(formatApiError(error, "保存失败，请检查单号是否重复或稍后重试。"));
      setRequestSubmitState("error");
    }
  }

  async function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecordSubmitState("saving");
    setRecordSubmitError("");

    try {
      const created = await createPurchaseRecord({
        purchaseNo: recordForm.purchaseNo,
        purchaserName: recordForm.purchaserName,
        sourceType: recordForm.sourceType,
        purchasePlatform: recordForm.purchasePlatform || null,
        supplierNameText: recordForm.supplierNameText || null,
        purchaseDescription: recordForm.purchaseDescription || null,
        contractId: recordForm.contractId || null,
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
        contractId: "",
        purchaseDate: "",
        materialName: "",
        purchaseQuantity: "",
        unit: "",
      });
      setRecordSubmitState("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setRecordSubmitError(formatApiError(error, "保存失败，请检查单号是否重复或稍后重试。"));
      setRecordSubmitState("error");
    }
  }

  return (
    <WorkspaceScaffold
        eyebrow="经营业务"
        title="采购管理"
        subtitle="默认处理采购待办；需求、执行和到货记录分区查看。"
        actions={(
          <span className="parties-total">
            <ShoppingCart aria-hidden="true" size={18} />
            {purchaseRequests.length + purchaseRecords.length} 条采购数据
          </span>
        )}
        summary={(
          <div className="summary-grid compact-summary" aria-label="采购摘要指标">
            <SummaryCard label="采购需求" value={purchaseRequests.length} detail="需求台账" tone="info" />
            <SummaryCard label="待审批" value={pendingApprovalRequests.length} detail="需要采购管理处理" tone={pendingApprovalRequests.length > 0 ? "warning" : "success"} />
            <SummaryCard label="待采购" value={purchaseRequests.filter((request) => request.status === "pending_purchase").length} detail="已准入未采购" tone="neutral" />
            <SummaryCard label="采购记录" value={purchaseRecords.length} detail="采购执行" tone="info" />
          </div>
        )}
        tabs={(
          <>
            <SegmentedTabs items={purchaseTabs} activeKey={activeTab} onChange={setActiveTab} ariaLabel="采购分区" />
            {canManage && activeTab === "requests" ? (
              <div className="workspace-primary-actions"><button type="button" onClick={() => setOpenFormDrawer("request")}>新增采购需求</button></div>
            ) : null}
            {canManage && activeTab === "records" ? (
              <div className="workspace-primary-actions"><button type="button" onClick={() => setOpenFormDrawer("record")}>新增采购记录</button></div>
            ) : null}
          </>
        )}
      >
      {activeTab === "todo" ? <SectionCard title="待审批" action={<Check aria-hidden="true" size={17} />}>
        {pendingApprovalRequests.length === 0 ? <StateMessage text="暂无待审批采购需求" /> : null}
        {pendingApprovalRequests.length > 0 ? (
          <>
            <label className="full-width-field">
              <span>审批备注</span>
              <input value={reviewRemark} onChange={(event) => setReviewRemark(event.target.value)} />
            </label>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>编号</th>
                    <th>申请人</th>
                    <th>物料</th>
                    <th>提交时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovalRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.requestNo}</td>
                      <td>{request.requesterName}</td>
                      <td>{request.lines[0]?.materialName ?? "-"}</td>
                      <td>{request.submittedAt ? formatDateTime(request.submittedAt) : "-"}</td>
                      <td>
                        {canManage ? (
                          <div className="inline-actions">
                            <button
                              type="button"
                              disabled={reviewState === "saving"}
                              onClick={() => setPendingReviewAction({ action: "approve", requestId: request.id })}
                            >
                              <Check aria-hidden="true" size={14} />
                              审批通过 {request.requestNo}
                            </button>
                            <button
                              type="button"
                              disabled={reviewState === "saving"}
                              onClick={() => setPendingReviewAction({ action: "reject", requestId: request.id })}
                            >
                              <X aria-hidden="true" size={14} />
                              驳回 {request.requestNo}
                            </button>
                            {pendingReviewAction?.requestId === request.id ? (
                              <div
                                className="inline-confirm-actions"
                                aria-label={`确认${pendingReviewAction.action === "approve" ? "审批通过" : "驳回"} ${request.requestNo}`}
                              >
                                <span>
                                  确认{pendingReviewAction.action === "approve" ? "审批通过" : "驳回"} {request.requestNo}？
                                </span>
                                <button
                                  type="button"
                                  disabled={reviewState === "saving"}
                                  onClick={() => handleRequestReview(pendingReviewAction.action, request)}
                                >
                                  确认{pendingReviewAction.action === "approve" ? "审批通过" : "驳回"}
                                </button>
                                <button type="button" onClick={() => setPendingReviewAction(null)}>取消</button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          "只读"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {reviewState === "error" ? <p className="form-error">{reviewError || "审批操作失败"}</p> : null}
      </SectionCard> : null}

      {activeTab === "requests" ? <div className="project-site-list-layout">
        <SectionCard title="采购需求" action={<ClipboardList aria-hidden="true" size={17} />}>
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
          {requestStatus === "ready" && filteredRequests.length > 0 ? (
            <PurchaseRequestsTable
              requests={filteredRequests}
              canManage={canManage}
              reviewState={reviewState}
              onSubmitRequest={(request) => handleRequestReview("submit", request)}
              onSelectRequest={(request) => setSelectedRequestId(request.id)}
            />
          ) : null}
        </SectionCard>

        <FormDrawer
          title="新增采购需求"
          open={openFormDrawer === "request"}
          dirty={requestFormDirty && requestSubmitState !== "saving"}
          onClose={() => setOpenFormDrawer(null)}
        >
          {canManage ? <form className="dashboard-panel workspace-form" onSubmit={handleRequestSubmit} noValidate>
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
          {requestSubmitState === "error" ? <p className="form-error">{requestSubmitError || "保存失败，请检查单号是否重复或稍后重试。"}</p> : null}
          </form> : null}
        </FormDrawer>
      </div> : null}

      {activeTab === "records" ? <div className="project-site-list-layout">
        <SectionCard title="采购执行" action={<PackageCheck aria-hidden="true" size={17} />}>
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
          {recordStatus === "ready" && filteredRecords.length > 0 ? <PurchaseRecordsTable records={filteredRecords} onSelectRecord={(record) => setSelectedRecordId(record.id)} /> : null}
        </SectionCard>

        <FormDrawer
          title="新增采购记录"
          open={openFormDrawer === "record"}
          dirty={recordFormDirty && recordSubmitState !== "saving"}
          onClose={() => setOpenFormDrawer(null)}
        >
          {canManage ? <form className="dashboard-panel workspace-form" onSubmit={handleRecordSubmit} noValidate>
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
            <span>关联合同</span>
            <select value={recordForm.contractId} onChange={(event) => setRecordForm((current) => ({ ...current, contractId: event.target.value }))}>
              <option value="">不关联合同</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractNo} {contract.contractName}
                </option>
              ))}
            </select>
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
          {recordSubmitState === "error" ? <p className="form-error">{recordSubmitError || "保存失败，请检查单号是否重复或稍后重试。"}</p> : null}
          </form> : null}
        </FormDrawer>
      </div> : null}

      {activeTab === "arrivals" ? (
        <EmptyState title="到货记录后续开放" description="当前到货与入库闭环在库存模块登记；稳定接口开放后在此展示到货记录。" />
      ) : null}

      <DetailDrawer title="采购需求详情" open={Boolean(selectedRequest)} onClose={() => setSelectedRequestId("")}>
        {selectedRequest ? <PurchaseRequestDetail request={selectedRequest} /> : null}
      </DetailDrawer>

      <DetailDrawer title="采购记录详情" open={Boolean(selectedRecord)} onClose={() => setSelectedRecordId("")}>
        {selectedRecord ? <PurchaseRecordDetail record={selectedRecord} /> : null}
      </DetailDrawer>
    </WorkspaceScaffold>
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
    <UiToolbar
      search={(
        <label className="table-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchLabel} />
        </label>
      )}
      filters={(
        <label className="table-filter">
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
      )}
    />
  );
}

function PurchaseRequestsTable({
  requests,
  canManage,
  reviewState,
  onSubmitRequest,
  onSelectRequest,
}: {
  requests: PurchaseRequestDto[];
  canManage: boolean;
  reviewState: "idle" | "saving" | "error";
  onSubmitRequest: (request: PurchaseRequestDto) => void;
  onSelectRequest: (request: PurchaseRequestDto) => void;
}) {
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
            <th>来源</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>审批人/备注</th>
            <th>期望到货</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const firstLine = request.lines[0];
            return (
              <tr key={request.id} tabIndex={0} onClick={() => onSelectRequest(request)} onKeyDown={(event) => { if (event.key === "Enter") onSelectRequest(request); }}>
                <td>{request.requestNo}</td>
                <td>{request.requesterName}</td>
                <td>{request.projectSiteName || request.departmentName}</td>
                <td>{firstLine?.materialName ?? "-"}</td>
                <td>{firstLine ? `${firstLine.requestedQuantity} ${firstLine.unit}` : "-"}</td>
                <td>{request.purpose === "库存补货建议" ? "库存补货建议" : "手工录入"}</td>
                <td>
                  <StatusBadge tone={purchaseRequestTone(request.status)}>
                    {requestStatusLabel.get(request.status)}
                  </StatusBadge>
                </td>
                <td>{request.submittedAt ? formatDateTime(request.submittedAt) : "-"}</td>
                <td>{request.reviewedByName || request.reviewRemark ? `${request.reviewedByName ?? "-"} ${request.reviewRemark ?? ""}` : "-"}</td>
                <td>{request.expectedArrivalDate || "-"}</td>
                <td>{formatDateTime(request.updatedAt)}</td>
                <td>
                  {canManage && request.status === "draft" ? (
                    <button type="button" disabled={reviewState === "saving"} onClick={(event) => { event.stopPropagation(); onSubmitRequest(request); }}>
                      提交 {request.requestNo}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseRecordsTable({ records, onSelectRecord }: { records: PurchaseRecordDto[]; onSelectRecord: (record: PurchaseRecordDto) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>采购单号</th>
            <th>采购人</th>
            <th>来源</th>
            <th>供应商/平台/店铺</th>
            <th>合同</th>
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
              <tr key={record.id} tabIndex={0} onClick={() => onSelectRecord(record)} onKeyDown={(event) => { if (event.key === "Enter") onSelectRecord(record); }}>
                <td>{record.purchaseNo}</td>
                <td>{record.purchaserName}</td>
                <td>{sourceTypeLabel.get(record.sourceType)}</td>
                <td>{sourceText}</td>
                <td>{record.contractNo ? `${record.contractNo} ${record.contractName ?? ""}` : "-"}</td>
                <td>{firstLine?.materialName ?? "-"}</td>
                <td>{firstLine ? `${firstLine.purchaseQuantity} ${firstLine.unit}` : "-"}</td>
                <td>{record.purchaseDate}</td>
                <td>
                  <StatusBadge tone={record.status === "cancelled" ? "warning" : "success"}>
                    {recordStatusLabel.get(record.status)}
                  </StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseRequestDetail({ request }: { request: PurchaseRequestDto }) {
  const firstLine = request.lines[0];
  return (
    <dl className="detail-grid">
      <dt>需求编号</dt>
      <dd>{request.requestNo}</dd>
      <dt>申请人</dt>
      <dd>{request.requesterName}</dd>
      <dt>部门/项目点</dt>
      <dd>{request.projectSiteName || request.departmentName || "-"}</dd>
      <dt>物料</dt>
      <dd>{firstLine ? `${firstLine.materialName} ${firstLine.requestedQuantity} ${firstLine.unit}` : "-"}</dd>
      <dt>状态</dt>
      <dd>{requestStatusLabel.get(request.status)}</dd>
      <dt>审批信息</dt>
      <dd>{request.reviewedByName || request.reviewRemark ? `${request.reviewedByName ?? "-"} ${request.reviewRemark ?? ""}` : "暂无"}</dd>
      <dt>更新时间</dt>
      <dd>{formatDateTime(request.updatedAt)}</dd>
    </dl>
  );
}

function PurchaseRecordDetail({ record }: { record: PurchaseRecordDto }) {
  const firstLine = record.lines[0];
  return (
    <dl className="detail-grid">
      <dt>采购单号</dt>
      <dd>{record.purchaseNo}</dd>
      <dt>采购人</dt>
      <dd>{record.purchaserName}</dd>
      <dt>来源</dt>
      <dd>{sourceTypeLabel.get(record.sourceType)}</dd>
      <dt>供应商/平台</dt>
      <dd>{record.supplierPartyName || record.supplierNameText || record.purchasePlatform || record.shopName || "-"}</dd>
      <dt>合同</dt>
      <dd>{record.contractNo ? `${record.contractNo} ${record.contractName ?? ""}` : "未关联"}</dd>
      <dt>物料</dt>
      <dd>{firstLine ? `${firstLine.materialName} ${firstLine.purchaseQuantity} ${firstLine.unit}` : "-"}</dd>
      <dt>状态</dt>
      <dd>{recordStatusLabel.get(record.status)}</dd>
    </dl>
  );
}

function purchaseRequestTone(status: PurchaseRequestStatusCode): "info" | "success" | "warning" | "danger" | "rejected" {
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "warning";
  if (status === "completed") return "success";
  if (status === "pending_approval") return "warning";
  if (status === "draft") return "info";
  return "success";
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
