import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  CertificateRecordDto,
  CertificateTypeCode,
  CreateCertificateRecordInput,
  EmployeeDto,
  PartyDto,
  ProjectSiteDto,
  ProjectSiteRosterPersonDto,
} from "@company-erp/shared";
import { apiBaseUrl, formatApiError, getAttachments, requestJson } from "../../apiClient";
import type { CertificatesWorkspaceProps, CertificateStatusFilter } from "./certificateWorkspaceTypes";
import {
  createEmptyCertificateForm,
  isCertificateTab,
  tabForPortalSection,
} from "./certificateWorkspaceTypes";
import { buildCertificateOwnerOptions } from "./certificateOwnerOptions";
import { filterCertificates, visibleCertificatesForTab } from "./certificateFilters";

async function defaultLoadCertificates(): Promise<CertificateRecordDto[]> {
  const payload = await requestJson<{ certificates: CertificateRecordDto[] }>(`${apiBaseUrl}/api/certificates`);
  return payload.certificates;
}

async function defaultCreateCertificate(input: CreateCertificateRecordInput): Promise<CertificateRecordDto> {
  const payload = await requestJson<{ certificate: CertificateRecordDto }>(`${apiBaseUrl}/api/certificates`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.certificate;
}

async function defaultLoadEmployees(): Promise<EmployeeDto[]> {
  const payload = await requestJson<{ employees: EmployeeDto[] }>(`${apiBaseUrl}/api/employees`);
  return payload.employees;
}

async function defaultLoadRosterPeople(): Promise<ProjectSiteRosterPersonDto[]> {
  const payload = await requestJson<{ rosterPeople: ProjectSiteRosterPersonDto[] }>(
    `${apiBaseUrl}/api/project-site-roster-persons?status=active`,
  );
  return payload.rosterPeople;
}

async function defaultLoadProjectSites(): Promise<ProjectSiteDto[]> {
  const payload = await requestJson<{ projectSites: ProjectSiteDto[] }>(`${apiBaseUrl}/api/project-sites`);
  return payload.projectSites;
}

async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

export function useCertificatesWorkspaceController({
  loadCertificates = defaultLoadCertificates,
  createCertificate = defaultCreateCertificate,
  loadEmployees = defaultLoadEmployees,
  loadRosterPeople = defaultLoadRosterPeople,
  loadProjectSites = defaultLoadProjectSites,
  loadParties = defaultLoadParties,
  loadUnifiedAttachments = getAttachments,
  canManage = true,
  allowedOwnerTypes,
  allowedPersonOwnerSources,
  portalSection,
  initialTab,
}: CertificatesWorkspaceProps) {
  const ownerOptions = useMemo(
    () => buildCertificateOwnerOptions({ allowedOwnerTypes, allowedPersonOwnerSources, portalSection }),
    [allowedOwnerTypes, allowedPersonOwnerSources, portalSection],
  );
  const [certificates, setCertificates] = useState<CertificateRecordDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [rosterPeople, setRosterPeople] = useState<ProjectSiteRosterPersonDto[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSiteDto[]>([]);
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [masterStatus, setMasterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CertificateStatusFilter>("all");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState(() =>
    createEmptyCertificateForm(ownerOptions.defaultOwnerType, ownerOptions.defaultPersonOwnerSource),
  );
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const [activeTab, setActiveTab] = useState(
    isCertificateTab(initialTab) ? initialTab : tabForPortalSection(portalSection),
  );
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  useEffect(() => {
    setActiveTab(isCertificateTab(initialTab) ? initialTab : tabForPortalSection(portalSection));
  }, [initialTab, portalSection]);

  useEffect(() => {
    const portalOwnerType = ownerOptions.portalOwnerType;
    if (!portalOwnerType || !ownerOptions.ownerTypeOptions.some((item) => item.code === portalOwnerType)) return;
    setForm((current) => {
      const nextCertificateType: CertificateTypeCode = portalOwnerType === "person" ? "person_health_cert" : "food_operation_license";
      if (
        current.ownerType === portalOwnerType &&
        current.certificateType === nextCertificateType &&
        (portalOwnerType !== "person" || current.ownerPersonSource === ownerOptions.defaultPersonOwnerSource)
      ) {
        return current;
      }
      return {
        ...current,
        certificateType: nextCertificateType,
        ownerType: portalOwnerType,
        ownerPersonSource: portalOwnerType === "person" ? ownerOptions.defaultPersonOwnerSource : current.ownerPersonSource,
        ownerEmployeeId: "",
        ownerRosterPersonId: "",
        ownerProjectSiteId: "",
        ownerPartyId: "",
      };
    });
  }, [ownerOptions]);

  useEffect(() => {
    const ownerTypeAllowed = ownerOptions.ownerTypeOptions.some((item) => item.code === form.ownerType);
    const personSourceAllowed = form.ownerType !== "person" || ownerOptions.personOwnerSourceOptions.includes(form.ownerPersonSource);
    if (ownerTypeAllowed && personSourceAllowed) return;
    setForm((current) => ({
      ...current,
      ownerType: ownerTypeAllowed ? current.ownerType : ownerOptions.defaultOwnerType,
      ownerPersonSource: personSourceAllowed ? current.ownerPersonSource : ownerOptions.defaultPersonOwnerSource,
      ownerEmployeeId: "",
      ownerRosterPersonId: "",
      ownerProjectSiteId: "",
      ownerPartyId: "",
    }));
  }, [form.ownerPersonSource, form.ownerType, ownerOptions]);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    loadCertificates()
      .then((records) => {
        if (!mounted) return;
        setCertificates(records);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadCertificates]);

  useEffect(() => {
    let mounted = true;
    setMasterStatus("loading");
    Promise.all([
      ownerOptions.shouldLoadEmployees ? loadEmployees() : Promise.resolve([]),
      ownerOptions.shouldLoadRosterPeople ? loadRosterPeople() : Promise.resolve([]),
      ownerOptions.shouldLoadProjectSites ? loadProjectSites() : Promise.resolve([]),
      ownerOptions.shouldLoadParties ? loadParties() : Promise.resolve([]),
    ])
      .then(([nextEmployees, nextRosterPeople, nextProjectSites, nextParties]) => {
        if (!mounted) return;
        setEmployees(nextEmployees);
        setRosterPeople(nextRosterPeople);
        setProjectSites(nextProjectSites);
        setParties(nextParties);
        setMasterStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setMasterStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadEmployees, loadParties, loadProjectSites, loadRosterPeople, ownerOptions]);

  const filteredCertificates = useMemo(
    () => filterCertificates({ certificates, query, statusFilter }),
    [certificates, query, statusFilter],
  );
  const visibleCertificates = useMemo(
    () => visibleCertificatesForTab(filteredCertificates, activeTab),
    [activeTab, filteredCertificates],
  );
  const selectedCertificate = filteredCertificates.find((certificate) => certificate.id === selectedCertificateId) ?? null;
  const expiringCount = certificates.filter((certificate) => certificate.computedStatus === "expiring_soon").length;
  const expiredCount = certificates.filter((certificate) => certificate.computedStatus === "expired").length;
  const validCount = certificates.filter((certificate) => certificate.computedStatus === "valid").length;
  const pendingReviewCount = certificates.filter((certificate) =>
    certificate.isComplianceCritical && !certificate.confirmedAt && !certificate.isDisabled
  ).length;

  function ownerNameFromForm() {
    if (form.ownerType === "person") {
      if (form.ownerPersonSource === "roster") {
        return rosterPeople.find((person) => person.id === form.ownerRosterPersonId)?.personName ?? form.ownerNameSnapshot;
      }
      return employees.find((employee) => employee.id === form.ownerEmployeeId)?.name ?? form.ownerNameSnapshot;
    }
    if (form.ownerType === "project_site") {
      return projectSites.find((site) => site.id === form.ownerProjectSiteId)?.siteName ?? form.ownerNameSnapshot;
    }
    if (form.ownerType === "supplier" || form.ownerType === "company") {
      return parties.find((party) => party.id === form.ownerPartyId)?.partyName ?? form.ownerNameSnapshot;
    }
    return form.ownerNameSnapshot;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");
    setSubmitError("");
    try {
      const created = await createCertificate({
        certificateCode: form.certificateCode,
        certificateName: form.certificateName,
        certificateType: form.certificateType,
        ownerType: form.ownerType,
        ownerEmployeeId: form.ownerType === "person" && form.ownerPersonSource === "employee" ? form.ownerEmployeeId || null : null,
        ownerRosterPersonId: form.ownerType === "person" && form.ownerPersonSource === "roster" ? form.ownerRosterPersonId || null : null,
        ownerProjectSiteId: form.ownerType === "project_site" ? form.ownerProjectSiteId || null : null,
        ownerPartyId: form.ownerType === "supplier" || form.ownerType === "company" ? form.ownerPartyId || null : null,
        ownerNameSnapshot: ownerNameFromForm(),
        certificateNumber: form.certificateNumber || null,
        issuingAuthority: form.issuingAuthority || null,
        validityType: form.validityType,
        expiryDate: form.validityType === "fixed_expiry" ? form.expiryDate || null : null,
        nextReviewDate: form.validityType === "fixed_expiry" ? null : form.nextReviewDate || null,
        reminderDays: form.reminderDays ? Number(form.reminderDays) : 30,
        isComplianceCritical: true,
        responsibleEmployeeId: form.responsibleEmployeeId || null,
        remark: form.remark || null,
      });
      setCertificates((current) => [created, ...current.filter((certificate) => certificate.id !== created.id)]);
      setForm(createEmptyCertificateForm(ownerOptions.defaultOwnerType, ownerOptions.defaultPersonOwnerSource));
      setSubmitState("saved");
      setCreateDrawerOpen(false);
    } catch (error) {
      setSubmitError(formatApiError(error, "证照保存失败，请检查编码、归属对象或日期。"));
      setSubmitState("error");
    }
  }

  return {
    activeTab,
    canManage,
    createDrawerOpen,
    employees,
    expiringCount,
    expiredCount,
    form,
    loadUnifiedAttachments,
    masterStatus,
    ownerOptions,
    parties,
    pendingReviewCount,
    portalSection,
    projectSites,
    query,
    rosterPeople,
    selectedCertificate,
    status,
    statusFilter,
    submitError,
    submitState,
    validCount,
    visibleCertificates,
    handleSubmit,
    setActiveTab,
    setCreateDrawerOpen,
    setForm,
    setQuery,
    setSelectedCertificateId,
    setStatusFilter,
  };
}

export type CertificatesWorkspaceController = ReturnType<typeof useCertificatesWorkspaceController>;
