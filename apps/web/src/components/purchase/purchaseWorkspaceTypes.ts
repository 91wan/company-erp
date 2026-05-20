import type {
  ContractDto,
  CreatePurchaseRecordInput,
  CreatePurchaseRequestInput,
  PurchaseRecordDto,
  PurchaseRecordStatusCode,
  PurchaseRequestDto,
  PurchaseRequestStatusCode,
  PurchaseSourceTypeCode,
} from "@company-erp/shared";

export type PurchaseWorkspaceProps = {
  loadPurchaseRequests?: () => Promise<PurchaseRequestDto[]>;
  loadPurchaseRecords?: () => Promise<PurchaseRecordDto[]>;
  loadContracts?: () => Promise<ContractDto[]>;
  createPurchaseRequest?: (input: CreatePurchaseRequestInput) => Promise<PurchaseRequestDto>;
  createPurchaseRecord?: (input: CreatePurchaseRecordInput) => Promise<PurchaseRecordDto>;
  submitPurchaseRequest?: (id: string) => Promise<PurchaseRequestDto>;
  approvePurchaseRequest?: (id: string, input: PurchaseRequestReviewPayload) => Promise<PurchaseRequestDto>;
  rejectPurchaseRequest?: (id: string, input: PurchaseRequestReviewPayload) => Promise<PurchaseRequestDto>;
  canManage?: boolean;
  initialTab?: string;
};

export type PurchaseRequestReviewPayload = {
  reviewedByName?: string | null;
  reviewRemark?: string | null;
};

export type RequestFormState = {
  requestNo: string;
  requesterName: string;
  departmentName: string;
  materialName: string;
  requestedQuantity: string;
  unit: string;
  expectedArrivalDate: string;
};

export type RecordFormState = {
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

export type PurchaseFormDrawer = "request" | "record" | null;
export type PurchaseTab = "todo" | "requests" | "records" | "arrivals";
export type PurchaseLoadState = "loading" | "ready" | "error";
export type PurchaseSubmitState = "idle" | "saving" | "error";
export type PurchasePendingReviewAction = {
  action: "approve" | "reject";
  requestId: string;
} | null;

export const purchaseTabs: { key: PurchaseTab; label: string }[] = [
  { key: "todo", label: "待办" },
  { key: "requests", label: "采购需求" },
  { key: "records", label: "采购执行" },
  { key: "arrivals", label: "到货记录" },
];

export function isPurchaseTab(value: string | undefined): value is PurchaseTab {
  return purchaseTabs.some((tab) => tab.key === value);
}

export const emptyRequestForm: RequestFormState = {
  requestNo: "",
  requesterName: "",
  departmentName: "",
  materialName: "",
  requestedQuantity: "",
  unit: "",
  expectedArrivalDate: "",
};

export const emptyRecordForm: RecordFormState = {
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

export type PurchaseRequestFilter = "all" | PurchaseRequestStatusCode;
export type PurchaseRecordFilter = "all" | PurchaseRecordStatusCode;
