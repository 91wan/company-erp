import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { BusinessProjectDto, ContractDto, ContractExpiryStateCode, ContractStatusCode, PartyDto, ProjectSiteDto } from "@company-erp/shared";
import { formatApiError, getAttachmentDownloadUrl, getAttachments } from "../../apiClient";
import { useFormErrors, useToast } from "../ui";
import {
  createContract as defaultCreateContract,
  loadBusinessProjects as defaultLoadBusinessProjects,
  loadContracts as defaultLoadContracts,
  loadParties as defaultLoadParties,
  loadProjectSites as defaultLoadProjectSites,
} from "./contractsApi";
import {
  CONTRACT_PAGE_SIZE,
  contractFormLabel,
  emptyContractForm,
  investmentCategoryLabel,
  isContractTab,
  subjectCategoryLabel,
  type ContractFormState,
  type ContractListSortField,
  type ContractsWorkspaceProps,
} from "./contractsTypes";

export function useContractsController({
  loadContracts = defaultLoadContracts,
  createContract = defaultCreateContract,
  loadParties = defaultLoadParties,
  loadProjectSites = defaultLoadProjectSites,
  loadBusinessProjects = defaultLoadBusinessProjects,
  loadUnifiedAttachments = getAttachments,
  getUnifiedAttachmentDownloadUrl = getAttachmentDownloadUrl,
  canManage = true,
  initialTab,
  initialEntityId,
}: ContractsWorkspaceProps) {
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [businessProjects, setBusinessProjects] = useState<BusinessProjectDto[]>([]);
  const [contractStatus, setContractStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatusCode>("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | ContractExpiryStateCode>("all");
  const [sortField, setSortField] = useState<ContractListSortField>("endDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [contractSubmitState, setContractSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [contractSubmitError, setContractSubmitError] = useState("");
  const [openFormDrawer, setOpenFormDrawer] = useState<"contract" | null>(null);
  const [activeTab, setActiveTab] = useState(isContractTab(initialTab) ? initialTab : "risk");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [contractForm, setContractForm] = useState<ContractFormState>({ ...emptyContractForm });
  const toast = useToast();
  const { errors, errorId, fieldProps, clearError, validate, formRef } = useFormErrors<
    | "contractNo"
    | "contractName"
    | "counterpartyPartyId"
    | "startDate"
    | "endDate"
    | "amount"
    | "budgetAmount"
  >();

  useEffect(() => {
    if (isContractTab(initialTab)) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialEntityId) {
      setSelectedContractId(initialEntityId);
      setActiveTab("ledger");
    }
  }, [initialEntityId]);

  useEffect(() => {
    let mounted = true;
    setContractStatus("loading");
    loadContracts()
      .then((nextContracts) => {
        if (!mounted) return;
        setContracts(nextContracts);
        setContractStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setContractStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadContracts]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    if (!canManage) {
      setParties([]);
      setProjectSites([]);
      setBusinessProjects([]);
      setMasterStatus("ready");
      return () => {
        mounted = false;
      };
    }
    Promise.all([loadParties(), loadProjectSites(), loadBusinessProjects()])
      .then(([nextParties, nextProjectSites, nextBusinessProjects]) => {
        if (!mounted) return;
        setParties(nextParties);
        setProjectSites(nextProjectSites);
        setBusinessProjects(nextBusinessProjects);
        setContractForm((current) => ({ ...current, counterpartyPartyId: current.counterpartyPartyId || nextParties[0]?.id || "" }));
        setMasterStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [canManage, loadBusinessProjects, loadParties, loadProjectSites]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, expiryFilter, query, statusFilter, sortDir, sortField]);

  const filteredContracts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contracts.filter((contract) => {
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      const matchesExpiry = expiryFilter === "all" || contract.expiryState === expiryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          contract.contractNo,
          contract.contractName,
          contract.counterpartyPartyName,
          contract.counterpartyNameSnapshot,
          contract.projectSiteName,
          contract.businessProjectName,
          contractFormLabel.get(contract.contractForm),
          subjectCategoryLabel.get(contract.subjectCategory),
          contract.investmentCategory ? investmentCategoryLabel.get(contract.investmentCategory) : null,
          contract.attachmentRef,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesExpiry && matchesQuery;
    });
  }, [contracts, expiryFilter, query, statusFilter]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId],
  );

  const visibleContracts = useMemo(() => {
    const scoped = filteredContracts.filter((contract) => {
      if (activeTab === "risk" || activeTab === "expiry") return contract.expiryState === "expired" || contract.expiryState === "expiring_soon";
      if (activeTab === "archive") return contract.status === "completed" || contract.status === "cancelled";
      return true;
    });
    return scoped.sort((left, right) => compareContracts(left, right, sortField, sortDir));
  }, [activeTab, filteredContracts, sortDir, sortField]);

  const pageCount = Math.max(1, Math.ceil(visibleContracts.length / CONTRACT_PAGE_SIZE));
  const pagedContracts = visibleContracts.slice((page - 1) * CONTRACT_PAGE_SIZE, page * CONTRACT_PAGE_SIZE);

  function changeSort(field: ContractListSortField) {
    setSortField(field);
    setSortDir((current) => (sortField === field && current === "asc" ? "desc" : "asc"));
  }

  async function handleContractSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endDateError =
      contractForm.contractForm !== "framework" && !contractForm.endDate
        ? "请填写结束日期"
        : contractForm.startDate && contractForm.endDate && contractForm.endDate < contractForm.startDate
          ? "结束日期不能早于开始日期"
          : undefined;
    const negativeAmount = (value: string) => value.trim() !== "" && Number(value) < 0;
    const valid = validate({
      contractNo: contractForm.contractNo.trim() ? undefined : "请填写合同编号",
      contractName: contractForm.contractName.trim() ? undefined : "请填写合同名称",
      counterpartyPartyId: contractForm.counterpartyPartyId ? undefined : "请选择相对方",
      startDate: contractForm.startDate ? undefined : "请填写开始日期",
      endDate: endDateError,
      amount: negativeAmount(contractForm.amount) ? "金额不能为负" : undefined,
      budgetAmount: negativeAmount(contractForm.budgetAmount) ? "金额不能为负" : undefined,
    });
    if (!valid) return;
    setContractSubmitState("saving");
    setContractSubmitError("");
    try {
      const created = await createContract({
        contractNo: contractForm.contractNo,
        contractName: contractForm.contractName,
        counterpartyPartyId: contractForm.counterpartyPartyId,
        direction: contractForm.direction,
        contractForm: contractForm.contractForm,
        subjectCategory: contractForm.subjectCategory,
        investmentCategory: contractForm.investmentCategory || null,
        businessProjectId: contractForm.businessProjectId || null,
        projectSiteId: contractForm.projectSiteId || null,
        signedDate: contractForm.signedDate || null,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate || null,
        amount: contractForm.amount ? Number(contractForm.amount) : null,
        budgetAmount: contractForm.budgetAmount ? Number(contractForm.budgetAmount) : null,
        status: contractForm.status,
        remark: contractForm.remark || null,
      });
      setContracts((current) => [created, ...current.filter((contract) => contract.id !== created.id)]);
      setContractForm({ ...emptyContractForm, counterpartyPartyId: parties[0]?.id ?? "" });
      setContractSubmitState("saved");
      setOpenFormDrawer(null);
      toast.notify("合同已保存", "success");
    } catch (error) {
      setContractSubmitError(formatApiError(error, "合同保存失败，请检查编号、日期或金额。"));
      setContractSubmitState("error");
    }
  }

  return {
    activeTab,
    businessProjects,
    canManage,
    contractForm,
    contractStatus,
    contractSubmitError,
    contractSubmitState,
    contracts,
    errorId,
    errors,
    expiryFilter,
    fieldProps,
    formRef,
    getUnifiedAttachmentDownloadUrl,
    hasCounterparties: parties.length > 0,
    initialEntityId,
    loadUnifiedAttachments,
    masterStatus,
    openFormDrawer,
    page,
    pageCount,
    parties,
    pagedContracts,
    projectSites,
    query,
    selectedContract,
    sortDir,
    sortField,
    statusFilter,
    totalVisibleContracts: visibleContracts.length,
    changeSort,
    clearError,
    handleContractSubmit,
    setActiveTab,
    setContractForm,
    setExpiryFilter,
    setOpenFormDrawer,
    setPage,
    setQuery,
    setSelectedContractId,
    setStatusFilter,
  };
}

function compareContracts(left: ContractDto, right: ContractDto, field: ContractListSortField, direction: "asc" | "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  const leftValue = contractSortValue(left, field);
  const rightValue = contractSortValue(right, field);
  return leftValue.localeCompare(rightValue, "zh-CN") * multiplier;
}

function contractSortValue(contract: ContractDto, field: ContractListSortField) {
  if (field === "contractNo") return contract.contractNo;
  if (field === "contractName") return contract.contractName;
  return contract.endDate ?? "9999-12-31";
}

export type ContractsController = ReturnType<typeof useContractsController>;
