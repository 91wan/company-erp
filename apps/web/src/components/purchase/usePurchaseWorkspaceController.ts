import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ContractDto,
  CreatePurchaseRecordInput,
  CreatePurchaseRequestInput,
  PurchaseRecordDto,
  PurchaseRequestDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, requestJson } from "../../apiClient";
import type {
  PurchasePendingReviewAction,
  PurchaseRecordFilter,
  PurchaseRequestFilter,
  PurchaseRequestReviewPayload,
  PurchaseSubmitState,
  PurchaseWorkspaceProps,
} from "./purchaseWorkspaceTypes";
import {
  emptyRecordForm,
  emptyRequestForm,
  isPurchaseTab,
} from "./purchaseWorkspaceTypes";
import type { RecordFormState, RequestFormState } from "./purchaseWorkspaceTypes";

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
  initialTab,
}: PurchaseWorkspaceProps) {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecordDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [requestStatus, setRequestStatus] = useState<"loading" | "ready" | "error">("loading");
  const [recordStatus, setRecordStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestQuery, setRequestQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState("");
  const [requestFilter, setRequestFilter] = useState<PurchaseRequestFilter>("all");
  const [recordFilter, setRecordFilter] = useState<PurchaseRecordFilter>("all");
  const [requestSubmitState, setRequestSubmitState] = useState<PurchaseSubmitState>("idle");
  const [recordSubmitState, setRecordSubmitState] = useState<PurchaseSubmitState>("idle");
  const [reviewState, setReviewState] = useState<PurchaseSubmitState>("idle");
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
      setRequestForm({ ...emptyRequestForm });
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
      setRecordForm({ ...emptyRecordForm });
      setRecordSubmitState("idle");
      setOpenFormDrawer(null);
    } catch (error) {
      setRecordSubmitError(formatApiError(error, "保存失败，请检查单号是否重复或稍后重试。"));
      setRecordSubmitState("error");
    }
  }

  return {
    activeTab,
    canManage,
    contracts,
    filteredRecords,
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
    setRecordFilter,
    setRecordForm,
    setRecordQuery,
    setRequestFilter,
    setRequestForm,
    setRequestQuery,
    setReviewRemark,
    setSelectedRecordId,
    setSelectedRequestId,
  };
}

export type PurchaseWorkspaceController = ReturnType<typeof usePurchaseWorkspaceController>;
