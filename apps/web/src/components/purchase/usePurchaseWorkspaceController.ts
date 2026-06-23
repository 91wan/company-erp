import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  ContractDto,
  CreatePurchaseRecordInput,
  CreatePurchaseRequestInput,
  PurchaseRecordDto,
  PurchaseRequestActionCode,
  PurchaseRequestDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, requestJson } from "../../apiClient";
import type {
  PurchasePendingReviewAction,
  PurchaseRecordFilter,
  PurchaseRecordSortField,
  PurchaseRecordsPage,
  PurchaseRecordsQuery,
  PurchaseRequestFilter,
  PurchaseRequestReviewPayload,
  PurchaseSubmitState,
  PurchaseWorkspaceProps,
} from "./purchaseWorkspaceTypes";
import {
  emptyRecordForm,
  emptyRequestForm,
  isPurchaseTab,
  PURCHASE_RECORD_PAGE_SIZE,
} from "./purchaseWorkspaceTypes";
import type { RecordFormState, RequestFormState } from "./purchaseWorkspaceTypes";
import { useToast } from "../ui";

async function defaultLoadPurchaseRequests(): Promise<PurchaseRequestDto[]> {
  const payload = await requestJson<{ purchaseRequests: PurchaseRequestDto[] }>(`${apiBaseUrl}/api/purchase-requests`);
  return payload.purchaseRequests;
}

function buildRecordsSearch(query: PurchaseRecordsQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.sortField) params.set("sortField", query.sortField);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  params.set("limit", String(query.limit));
  params.set("offset", String(query.offset));
  return params.toString();
}

async function defaultLoadPurchaseRecords(query: PurchaseRecordsQuery): Promise<PurchaseRecordsPage> {
  const payload = await requestJson<{ purchaseRecords: PurchaseRecordDto[]; total?: number }>(
    `${apiBaseUrl}/api/purchase-records?${buildRecordsSearch(query)}`,
  );
  return { records: payload.purchaseRecords, total: payload.total ?? payload.purchaseRecords.length };
}

function normalizeRecordsPage(result: PurchaseRecordDto[] | PurchaseRecordsPage): PurchaseRecordsPage {
  return Array.isArray(result) ? { records: result, total: result.length } : result;
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

export function usePurchaseWorkspaceController({
  loadPurchaseRequests = defaultLoadPurchaseRequests,
  loadPurchaseRecords = defaultLoadPurchaseRecords,
  loadContracts = defaultLoadContracts,
  createPurchaseRequest = defaultCreatePurchaseRequest,
  createPurchaseRecord = defaultCreatePurchaseRecord,
  submitPurchaseRequest = defaultSubmitPurchaseRequest,
  approvePurchaseRequest = defaultApprovePurchaseRequest,
  rejectPurchaseRequest = defaultRejectPurchaseRequest,
  canManage = true,
  canReadAuditLogs = false,
  initialTab,
}: PurchaseWorkspaceProps) {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecordDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [requestStatus, setRequestStatus] = useState<"loading" | "ready" | "error">("loading");
  const [recordStatus, setRecordStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestQuery, setRequestQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState("");
  const [debouncedRecordQuery, setDebouncedRecordQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState<PurchaseRequestFilter>("all");
  const [recordFilter, setRecordFilter] = useState<PurchaseRecordFilter>("all");
  const [recordSort, setRecordSort] = useState<{ field: PurchaseRecordSortField; direction: "asc" | "desc" } | null>(null);
  const [recordOffset, setRecordOffset] = useState(0);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordPageSize, setRecordPageSize] = useState(PURCHASE_RECORD_PAGE_SIZE);
  const [recordRefetching, setRecordRefetching] = useState(false);
  const recordsLoadedRef = useRef(false);
  const [requestSubmitState, setRequestSubmitState] = useState<PurchaseSubmitState>("idle");
  const [recordSubmitState, setRecordSubmitState] = useState<PurchaseSubmitState>("idle");
  const [reviewState, setReviewState] = useState<PurchaseSubmitState>("idle");
  const toast = useToast();
  const [requestSubmitError, setRequestSubmitError] = useState("");
  const [recordSubmitError, setRecordSubmitError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewRemark, setReviewRemark] = useState("");
  const [pendingReviewAction, setPendingReviewAction] = useState<PurchasePendingReviewAction>(null);
  const [openFormDrawer, setOpenFormDrawer] = useState<"request" | "record" | null>(null);
  const [activeTab, setActiveTab] = useState(isPurchaseTab(initialTab) ? initialTab : "todo");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [requestForm, setRequestForm] = useState<RequestFormState>({ ...emptyRequestForm });
  const [recordForm, setRecordForm] = useState<RecordFormState>({ ...emptyRecordForm });

  useEffect(() => {
    if (isPurchaseTab(initialTab)) setActiveTab(initialTab);
  }, [initialTab]);

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
    const handle = setTimeout(() => setDebouncedRecordQuery(recordQuery.trim()), 300);
    return () => clearTimeout(handle);
  }, [recordQuery]);

  useEffect(() => {
    let mounted = true;
    // 首次加载才整页显示「加载中」；后续筛选/搜索/翻页只标记 refetching，保留旧行避免闪烁。
    if (recordsLoadedRef.current) setRecordRefetching(true);
    else setRecordStatus("loading");
    Promise.resolve(
      loadPurchaseRecords({
        status: recordFilter === "all" ? undefined : recordFilter,
        q: debouncedRecordQuery || undefined,
        sortField: recordSort?.field,
        sortDir: recordSort?.direction,
        limit: recordPageSize,
        offset: recordOffset,
      }),
    )
      .then((result) => {
        if (!mounted) return;
        const page = normalizeRecordsPage(result);
        setPurchaseRecords(page.records);
        setRecordTotal(page.total);
        setRecordStatus("ready");
        setRecordRefetching(false);
        recordsLoadedRef.current = true;
      })
      .catch(() => {
        if (!mounted) return;
        setRecordRefetching(false);
        setRecordStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadPurchaseRecords, recordFilter, debouncedRecordQuery, recordSort, recordOffset, recordPageSize]);

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

  // 采购记录走服务端分页 + 服务端筛选：状态/搜索/翻页变化时回到第一页重新请求。
  const changeRecordFilter = (next: PurchaseRecordFilter) => {
    setRecordOffset(0);
    setRecordFilter(next);
  };
  const changeRecordQuery = (next: string) => {
    setRecordOffset(0);
    setRecordQuery(next);
  };
  const recordPage = Math.floor(recordOffset / recordPageSize) + 1;
  const recordPageCount = Math.max(1, Math.ceil(recordTotal / recordPageSize));
  const canPrevRecordPage = recordOffset > 0;
  const canNextRecordPage = recordOffset + recordPageSize < recordTotal;
  const goToPrevRecordPage = () => setRecordOffset((current) => Math.max(0, current - recordPageSize));
  const goToNextRecordPage = () => setRecordOffset((current) => current + recordPageSize);
  const goToRecordPage = (page: number) => {
    const target = Math.min(Math.max(page, 1), recordPageCount);
    setRecordOffset((target - 1) * recordPageSize);
  };
  const changeRecordPageSize = (size: number) => {
    setRecordOffset(0);
    setRecordPageSize(size);
  };
  // 排序走服务端：变更排序列/方向时回到第一页，用新顺序从头分页。
  const changeRecordSort = (field: PurchaseRecordSortField) => {
    setRecordOffset(0);
    setRecordSort((current) =>
      current && current.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" },
    );
  };
  // 区分「暂无数据」与「未找到匹配」：有筛选或搜索词时按搜索无结果处理。
  const recordSearchActive = recordFilter !== "all" || debouncedRecordQuery.length > 0;

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

  async function handleRequestReview(action: PurchaseRequestActionCode, target: PurchaseRequestDto) {
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
      toast.notify(
        action === "submit"
          ? "采购需求已提交审核"
          : action === "approve"
            ? "采购需求已通过"
            : "采购需求已驳回",
        "success",
      );
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
      setRequestForm({ ...emptyRequestForm });
      setRequestSubmitState("idle");
      setOpenFormDrawer(null);
      toast.notify("采购需求已保存", "success");
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
      setRecordTotal((current) => current + 1);
      setRecordForm({ ...emptyRecordForm });
      setRecordSubmitState("idle");
      setOpenFormDrawer(null);
      toast.notify("采购记录已保存", "success");
    } catch (error) {
      setRecordSubmitError(formatApiError(error, "保存失败，请检查单号是否重复或稍后重试。"));
      setRecordSubmitState("error");
    }
  }

  return {
    activeTab,
    canManage,
    canReadAuditLogs,
    contracts,
    filteredRecords: purchaseRecords,
    filteredRequests,
    openFormDrawer,
    pendingApprovalRequests,
    pendingReviewAction,
    purchaseRecords,
    purchaseRequests,
    recordFilter,
    recordForm,
    recordFormDirty,
    recordQuery,
    recordStatus,
    recordTotal,
    recordPage,
    recordPageCount,
    recordPageSize,
    recordRefetching,
    recordSearchActive,
    recordSortField: recordSort?.field ?? null,
    recordSortDir: recordSort?.direction ?? "asc",
    changeRecordSort,
    canPrevRecordPage,
    canNextRecordPage,
    goToPrevRecordPage,
    goToNextRecordPage,
    goToRecordPage,
    changeRecordPageSize,
    recordSubmitError,
    recordSubmitState,
    requestFilter,
    requestForm,
    requestFormDirty,
    requestQuery,
    requestStatus,
    requestSubmitError,
    requestSubmitState,
    reviewError,
    reviewRemark,
    reviewState,
    selectedRecord,
    selectedRequest,
    handleRecordSubmit,
    handleRequestReview,
    handleRequestSubmit,
    setActiveTab,
    setOpenFormDrawer,
    setPendingReviewAction,
    setRecordFilter: changeRecordFilter,
    setRecordForm,
    setRecordQuery: changeRecordQuery,
    setRequestFilter,
    setRequestForm,
    setRequestQuery,
    setReviewRemark,
    setSelectedRecordId,
    setSelectedRequestId,
  };
}

export type PurchaseWorkspaceController = ReturnType<typeof usePurchaseWorkspaceController>;
