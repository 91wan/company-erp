import {
  CONTRACT_DIRECTIONS,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_FORMS,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  CONTRACT_SUBJECT_CATEGORIES,
  type AttachmentRecordDto,
  type BusinessProjectDto,
  type ContractDirectionCode,
  type ContractDto,
  type ContractFormCode,
  type ContractInvestmentCategoryCode,
  type ContractStatusCode,
  type ContractSubjectCategoryCode,
  type CreateContractInput,
  type PartyDto,
  type ProjectSiteDto,
} from "@company-erp/shared";
import type { AttachmentFilters } from "../../apiClient";

export type ContractsWorkspaceProps = {
  loadContracts?: () => Promise<ContractDto[]>;
  createContract?: (input: CreateContractInput) => Promise<ContractDto>;
  loadParties?: () => Promise<PartyDto[]>;
  loadProjectSites?: () => Promise<ProjectSiteDto[]>;
  loadBusinessProjects?: () => Promise<BusinessProjectDto[]>;
  loadUnifiedAttachments?: (filters: AttachmentFilters) => Promise<AttachmentRecordDto[]>;
  getUnifiedAttachmentDownloadUrl?: (id: string) => Promise<string>;
  canManage?: boolean;
  initialTab?: string;
  initialEntityId?: string;
};

export type ContractFormState = {
  contractNo: string;
  contractName: string;
  counterpartyPartyId: string;
  direction: ContractDirectionCode;
  contractForm: ContractFormCode;
  subjectCategory: ContractSubjectCategoryCode;
  investmentCategory: "" | ContractInvestmentCategoryCode;
  status: ContractStatusCode;
  businessProjectId: string;
  projectSiteId: string;
  signedDate: string;
  startDate: string;
  endDate: string;
  amount: string;
  budgetAmount: string;
  remark: string;
};

export type ContractTab = "risk" | "ledger" | "expiry" | "attachments" | "archive";
export type ContractListSortField = "contractNo" | "contractName" | "endDate";
export type ContractFormDrawerState = "contract" | null;

export const CONTRACT_PAGE_SIZE = 20;

export const emptyContractForm: ContractFormState = {
  contractNo: "",
  contractName: "",
  counterpartyPartyId: "",
  direction: "purchase_contract",
  contractForm: "one_time",
  subjectCategory: "other",
  investmentCategory: "",
  status: "active",
  businessProjectId: "",
  projectSiteId: "",
  signedDate: "",
  startDate: "",
  endDate: "",
  amount: "",
  budgetAmount: "",
  remark: "",
};

export const contractTabs: { key: ContractTab; label: string }[] = [
  { key: "risk", label: "合同风险" },
  { key: "ledger", label: "合同台账" },
  { key: "expiry", label: "到期提醒" },
  { key: "attachments", label: "附件" },
  { key: "archive", label: "归档" },
];

export function isContractTab(value: string | undefined): value is ContractTab {
  return contractTabs.some((tab) => tab.key === value);
}

export const directionLabel = new Map(CONTRACT_DIRECTIONS.map((direction) => [direction.code, direction.label]));
export const contractFormLabel = new Map(CONTRACT_FORMS.map((form) => [form.code, form.label]));
export const contractStatusLabel = new Map(CONTRACT_STATUSES.map((status) => [status.code, status.label]));
export const subjectCategoryLabel = new Map(CONTRACT_SUBJECT_CATEGORIES.map((category) => [category.code, category.label]));
export const investmentCategoryLabel = new Map(CONTRACT_INVESTMENT_CATEGORIES.map((category) => [category.code, category.label]));

export function formatMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return "-";
  return `${currency} ${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function formatContractDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export {
  CONTRACT_DIRECTIONS,
  CONTRACT_EXPIRY_STATES,
  CONTRACT_FORMS,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  CONTRACT_SUBJECT_CATEGORIES,
};
