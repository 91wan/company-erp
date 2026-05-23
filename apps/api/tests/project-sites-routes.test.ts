import { describe, expect, it, vi } from "vitest";
import type {
  AuditLogDto,
  CreateProjectSiteInput,
  CreateProjectUsageRequestInput,
  IssueProjectUsageRequestInput,
  MaterialDto,
  ProjectSiteComplianceReviewStatusCode,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto,
  ProjectSiteEmployerLiabilityInsurancePolicyDto,
  ProjectSiteDto,
  ProjectSiteInvestmentSummaryDto,
  ProjectSiteKitchenEquipmentChangeRequestDto,
  ProjectSiteKitchenEquipmentDto,
  ProjectSitePayrollSubmissionDto,
  ProjectSiteRosterPersonDto,
  ProjectUsageRequestDto,
  UpdateProjectSiteInput,
  UpdateProjectUsageRequestInput,
  WarehouseDto,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import type { AuditLogRepository } from "../src/auditLogs";
import { externalProjectSiteAccountSiteIds, scopedProjectSiteIds } from "../src/appRouteContext";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";
import {
  ProjectSiteConflictError,
  ProjectUsageRequestConflictError,
  ProjectUsageRequestValidationError,
  type ProjectSiteComplianceRepository,
  type ProjectSiteKitchenEquipmentRepository,
  type ProjectSiteRepository,
  type ProjectUsageRequestRepository,
} from "../src/projectSites";
import type { MaterialRepository, WarehouseRepository } from "../src/materialsWarehouses";

import { createFakeAuthSessionMethods } from "./testAuthSessionStore";

const now = "2026-05-11T13:00:00.000Z";
const warehouseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const materialId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const rosterPersonId = "12121212-1212-4121-8121-121212121212";
const insurancePolicyId = "13131313-1313-4131-8131-131313131313";
const kitchenEquipmentId = "24242424-2424-4242-8242-242424242424";
const kitchenEquipmentChangeRequestId = "25252525-2525-4252-8252-252525252525";

function createFakeAuditLogRepository(): AuditLogRepository {
  const logs: AuditLogDto[] = [];
  return {
    async list(filters) {
      return logs.filter((log) => !filters.action || log.action === filters.action);
    },
    async create(input) {
      const log: AuditLogDto = {
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(logs.length + 1).padStart(12, "0")}`,
        actorUserId: input.actorUserId ?? null,
        actorUsername: input.actorUsername ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeJson: input.beforeJson ?? null,
        afterJson: input.afterJson ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        createdAt: now,
      };
      logs.push(log);
      return log;
    },
  };
}

function makeProjectSite(overrides: Partial<ProjectSiteDto> = {}): ProjectSiteDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    siteCode: "SITE-WX-001",
    siteName: "科技园一期项目点",
    clientPartyId: "22222222-2222-4222-8222-222222222222",
    clientPartyName: "无锡科技园服务单位",
    operatorPartyId: "33333333-3333-4333-8333-333333333333",
    operatorPartyName: "我方无锡公司",
    serviceMode: "direct",
    subcontractorPartyId: null,
    subcontractorPartyName: null,
    region: "无锡",
    siteAddress: "无锡市新吴区",
    serviceType: "园区综合服务",
    status: "active",
    payrollAgencyRequired: false,
    startDate: "2026-05-01",
    endDate: null,
    primaryManagerEmployeeId: "44444444-4444-4444-8444-444444444444",
    primaryManagerEmployeeName: "张三",
    clientContactName: "李客户",
    clientContactPhone: "13800000000",
    subcontractorContactName: null,
    subcontractorContactPhone: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRosterPerson(overrides: Partial<ProjectSiteRosterPersonDto> = {}): ProjectSiteRosterPersonDto {
  return {
    id: rosterPersonId,
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    personName: "王现场",
    phone: "13800001111",
    identityNoLast4: "1234",
    workerType: "direct_site_staff",
    jobRole: "厨师",
    startDate: "2026-05-01",
    endDate: null,
    status: "active",
    sourceAttachmentPath: "legacy-fixtures/roster/site.xlsx",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeInsurancePolicy(
  overrides: Partial<ProjectSiteEmployerLiabilityInsurancePolicyDto> = {},
): ProjectSiteEmployerLiabilityInsurancePolicyDto {
  return {
    id: insurancePolicyId,
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    policyNo: "ELI202605001",
    insurerName: "太平洋保险",
    startDate: "2026-05-01",
    endDate: "2026-06-08",
    attachmentPath: "legacy-fixtures/insurance/ELI202605001.pdf",
    reviewStatus: "pending",
    reviewedByEmployeeId: null,
    reviewedByEmployeeName: null,
    reviewedAt: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCoveredPerson(
  overrides: Partial<ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto> = {},
): ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto {
  return {
    id: "14141414-1414-4141-8141-141414141414",
    policyId: insurancePolicyId,
    rosterPersonId,
    rosterPersonName: "王现场",
    coveredNameSnapshot: "王现场",
    identityNoLast4Snapshot: "1234",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makePayrollSubmission(overrides: Partial<ProjectSitePayrollSubmissionDto> = {}): ProjectSitePayrollSubmissionDto {
  return {
    id: "15151515-1515-4151-8151-151515151515",
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    payrollMonth: "2026-05",
    attachmentPath: "legacy-fixtures/payroll/SITE-WX-001-2026-05.xlsx",
    submittedBy: "项目点负责人",
    submittedAt: now,
    reviewStatus: "pending",
    reviewedByEmployeeId: null,
    reviewedByEmployeeName: null,
    reviewedAt: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeKitchenEquipment(overrides: Partial<ProjectSiteKitchenEquipmentDto> = {}): ProjectSiteKitchenEquipmentDto {
  return {
    id: kitchenEquipmentId,
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    equipmentName: "六门冰柜",
    equipmentCategory: "冷藏设备",
    specification: "1800L",
    quantity: 2,
    unit: "台",
    location: "后厨冷藏区",
    status: "in_use",
    companyAssetTag: "WX-ZC-ICE-001",
    sourceContractId: "33333333-3333-4333-8333-333333333333",
    sourceContractNo: "HT-SB-2026-001",
    sourceContractName: "厨房设备采购合同",
    lastCheckedDate: "2026-05-10",
    attachmentPath: "legacy-fixtures/equipment/icebox.jpg",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeKitchenEquipmentChangeRequest(
  overrides: Partial<ProjectSiteKitchenEquipmentChangeRequestDto> = {},
): ProjectSiteKitchenEquipmentChangeRequestDto {
  return {
    id: kitchenEquipmentChangeRequestId,
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    equipmentId: kitchenEquipmentId,
    equipmentName: "六门冰柜",
    changeType: "status_change",
    proposedQuantity: null,
    proposedLocation: null,
    proposedStatus: "repair_needed",
    attachmentPath: "legacy-fixtures/equipment/repair-needed.jpg",
    description: "压缩机异响，需要维修",
    submittedByAccountId: "abababab-abab-4bab-8bab-abababababab",
    submittedByNameSnapshot: "王项目",
    submittedByPhoneSnapshot: "13900000000",
    reviewStatus: "pending",
    reviewedByEmployeeId: null,
    reviewedByEmployeeName: null,
    reviewedAt: null,
    reviewRemark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeComplianceSummary(overrides: Partial<ProjectSiteComplianceSummaryDto> = {}): ProjectSiteComplianceSummaryDto {
  return {
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    payrollAgencyRequired: true,
    activeRosterCount: 2,
    missingHealthCertificateCount: 1,
    expiringHealthCertificateCount: 1,
    expiredHealthCertificateCount: 1,
    insuranceUncoveredActiveRosterCount: 1,
    insuranceExpiringSoonCount: 1,
    insuranceExpiredCount: 0,
    foodOperationLicenseStatus: "expiring_soon",
    payrollCurrentMonthStatus: "pending",
    blockingIssueCount: 3,
    warningIssueCount: 2,
    generatedAt: now,
    ...overrides,
  };
}

function makeUsageRequest(overrides: Partial<ProjectUsageRequestDto> = {}): ProjectUsageRequestDto {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    requestNo: "USE20260511001",
    requestDate: "2026-05-11",
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    projectSiteName: "科技园一期项目点",
    warehouseId,
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    materialId,
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    requestedQuantity: 10,
    approvedQuantity: null,
    issuedQuantity: 0,
    unit: "套",
    purpose: "项目点新员工补领",
    requestedBy: "项目点负责人",
    submittedByAccountId: null,
    submittedByNameSnapshot: null,
    submittedByPhoneSnapshot: null,
    expectedDate: "2026-05-15",
    status: "pending",
    outboundNo: null,
    unitChargePrice: null,
    chargeAmount: 0,
    chargePriceSource: null,
    chargeRemark: null,
    lastIssuedAt: null,
    lastReceivedByName: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMaterial(overrides: Partial<MaterialDto> = {}): MaterialDto {
  return {
    id: materialId,
    materialCode: "MAT0001",
    materialName: "定制员工工服",
    specification: "夏装 L 码",
    materialCategory: "定制物料",
    baseUnit: "套",
    defaultWarehouseId: warehouseId,
    defaultWarehouseName: "无锡总部仓库",
    defaultSupplierPartyId: null,
    defaultSupplierPartyName: null,
    safeStock: 20,
    isProjectSiteSaleEnabled: true,
    purchaseReferencePrice: 80,
    projectSiteSalePrice: 98,
    projectSiteSaleUnit: "套",
    projectSiteSaleRemark: "项目点领用核算价",
    isConsumable: true,
    status: "enabled",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeWarehouse(overrides: Partial<WarehouseDto> = {}): WarehouseDto {
  return {
    id: warehouseId,
    warehouseCode: "WH-WX-HQ",
    warehouseName: "无锡总部仓库",
    warehouseType: "headquarters",
    projectSiteId: null,
    managerName: "王仓管",
    managerPhone: "13900000000",
    status: "enabled",
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeProjectSiteRepository(seed: ProjectSiteDto[] = []): ProjectSiteRepository {
  const sites = [...seed];
  const investmentSummary: ProjectSiteInvestmentSummaryDto = {
    projectSiteId: "11111111-1111-4111-8111-111111111111",
    contractCount: 4,
    totalAmount: 260000,
    categories: [
      { investmentCategory: "renovation", contractCount: 1, totalAmount: 90000 },
      { investmentCategory: "equipment", contractCount: 2, totalAmount: 150000 },
      { investmentCategory: "advertising_signage", contractCount: 1, totalAmount: 20000 },
    ],
  };

  return {
    async list(filters) {
      return sites.filter((site) => {
        const matchesStatus = filters.status ? site.status === filters.status : true;
        const matchesMode = filters.serviceMode ? site.serviceMode === filters.serviceMode : true;
        const matchesClient = filters.clientPartyId ? site.clientPartyId === filters.clientPartyId : true;
        const matchesScopedSites = (filters as { projectSiteIds?: string[] }).projectSiteIds?.length
          ? (filters as { projectSiteIds: string[] }).projectSiteIds.includes(site.id)
          : true;
        const matchesQuery = filters.q
          ? [site.siteCode, site.siteName, site.clientPartyName, site.region]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesMode && matchesClient && matchesScopedSites && matchesQuery;
      });
    },
    async getById(id) {
      return sites.find((site) => site.id === id) ?? null;
    },
    async getInvestmentSummary(id) {
      if (!sites.some((site) => site.id === id)) return null;
      return { ...investmentSummary, projectSiteId: id };
    },
    async create(input: CreateProjectSiteInput) {
      if (sites.some((site) => site.siteCode === input.siteCode)) throw new ProjectSiteConflictError("siteCode");
      const site = makeProjectSite({
        id: "66666666-6666-4666-8666-666666666666",
        ...input,
        serviceMode: input.serviceMode ?? "direct",
        status: input.status ?? "active",
        clientPartyName: input.clientPartyId ? "无锡科技园服务单位" : null,
        subcontractorPartyName: input.subcontractorPartyId ? "外包服务公司" : null,
      });
      sites.unshift(site);
      return site;
    },
    async update(id: string, input: UpdateProjectSiteInput) {
      const index = sites.findIndex((site) => site.id === id);
      if (index === -1) return null;
      if (input.siteCode && sites.some((site) => site.id !== id && site.siteCode === input.siteCode)) {
        throw new ProjectSiteConflictError("siteCode");
      }
      sites[index] = { ...sites[index], ...input, updatedAt: now };
      return sites[index];
    },
  };
}

function createFakeComplianceRepository(): ProjectSiteComplianceRepository {
  const rosterPeople = [
    makeRosterPerson(),
    makeRosterPerson({ id: "16161616-1616-4161-8161-161616161616", personName: "李离场", status: "left" }),
    makeRosterPerson({
      id: "30303030-3030-4303-8303-303030303030",
      projectSiteId: "22222222-2222-4222-8222-222222222222",
      projectSiteName: "滨江项目点",
      personName: "周外场",
    }),
  ];
  const policies = [
    makeInsurancePolicy(),
    makeInsurancePolicy({
      id: "31313131-3131-4313-8313-313131313131",
      projectSiteId: "22222222-2222-4222-8222-222222222222",
      projectSiteName: "滨江项目点",
      policyNo: "ELI202605999",
    }),
  ];
  const coveredPeople = [makeCoveredPerson()];
  const payrollSubmissions = [makePayrollSubmission()];

  return {
    async listRosterPeople(filters) {
      return rosterPeople.filter((person) => {
        const matchesSite = filters.projectSiteId ? person.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(person.projectSiteId) : true;
        const matchesStatus = filters.status ? person.status === filters.status : true;
        return matchesSite && matchesScopedSites && matchesStatus;
      });
    },
    async createRosterPerson(input) {
      const person = makeRosterPerson({ id: "17171717-1717-4171-8171-171717171717", ...input });
      rosterPeople.unshift(person);
      return person;
    },
    async listInsurancePolicies(filters) {
      return policies.filter((policy) => {
        const matchesSite = filters.projectSiteId ? policy.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(policy.projectSiteId) : true;
        return matchesSite && matchesScopedSites;
      });
    },
    async createInsurancePolicy(input) {
      const policy = makeInsurancePolicy({ id: "18181818-1818-4181-8181-181818181818", ...input });
      policies.unshift(policy);
      return policy;
    },
    async listCoveredPeople(filters) {
      return coveredPeople.filter((person) => {
        const policy = policies.find((item) => item.id === person.policyId);
        const matchesPolicy = filters.policyId ? person.policyId === filters.policyId : true;
        const matchesSite = filters.projectSiteId ? policy?.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds?.length ? Boolean(policy && filters.projectSiteIds.includes(policy.projectSiteId)) : true;
        return matchesPolicy && matchesSite && matchesScopedSites;
      });
    },
    async createCoveredPerson(input) {
      const covered = makeCoveredPerson({ id: "19191919-1919-4191-8191-191919191919", ...input });
      coveredPeople.unshift(covered);
      return covered;
    },
    async listPayrollSubmissions(filters) {
      return payrollSubmissions.filter((submission) => {
        const matchesSite = filters.projectSiteId ? submission.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(submission.projectSiteId) : true;
        const matchesMonth = filters.payrollMonth ? submission.payrollMonth === filters.payrollMonth : true;
        return matchesSite && matchesScopedSites && matchesMonth;
      });
    },
    async createPayrollSubmission(input) {
      const submission = makePayrollSubmission({
        id: "20202020-2020-4202-8202-202020202020",
        ...input,
        reviewStatus: (input.reviewStatus ?? "pending") as ProjectSiteComplianceReviewStatusCode,
      });
      payrollSubmissions.unshift(submission);
      return submission;
    },
    async getComplianceSummaries(projectSiteIds?: readonly string[]) {
      const summaries = [
        makeComplianceSummary({ projectSiteId: "11111111-1111-4111-8111-111111111111" }),
      ];
      return projectSiteIds ? summaries.filter((summary) => projectSiteIds.includes(summary.projectSiteId)) : summaries;
    },
    async getComplianceSummary(projectSiteId) {
      return projectSiteId === "11111111-1111-4111-8111-111111111111" ? makeComplianceSummary({ projectSiteId }) : null;
    },
  };
}

function createFakeKitchenEquipmentRepository(): ProjectSiteKitchenEquipmentRepository {
  const equipment = [
    makeKitchenEquipment(),
    makeKitchenEquipment({
      id: "26262626-2626-4262-8262-262626262626",
      projectSiteId: "22222222-2222-4222-8222-222222222222",
      projectSiteName: "滨江项目点",
      equipmentName: "蒸饭车",
      companyAssetTag: "WX-ZC-STEAM-001",
    }),
  ];
  const changeRequests = [makeKitchenEquipmentChangeRequest()];

  return {
    async listEquipment(filters) {
      return equipment.filter((item) => {
        const matchesSite = filters.projectSiteId ? item.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(item.projectSiteId) : true;
        const matchesStatus = filters.status ? item.status === filters.status : true;
        return matchesSite && matchesScopedSites && matchesStatus;
      });
    },
    async createEquipment(input) {
      const item = makeKitchenEquipment({ id: "27272727-2727-4272-8272-272727272727", status: input.status ?? "in_use", ...input });
      equipment.unshift(item);
      return item;
    },
    async updateEquipment(id, input) {
      const index = equipment.findIndex((item) => item.id === id);
      if (index === -1) return null;
      equipment[index] = { ...equipment[index], ...input, updatedAt: now };
      return equipment[index];
    },
    async listChangeRequests(filters) {
      return changeRequests.filter((request) => {
        const matchesSite = filters.projectSiteId ? request.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(request.projectSiteId) : true;
        const matchesStatus = filters.reviewStatus ? request.reviewStatus === filters.reviewStatus : true;
        return matchesSite && matchesScopedSites && matchesStatus;
      });
    },
    async createChangeRequest(input) {
      const request = makeKitchenEquipmentChangeRequest({
        id: "28282828-2828-4282-8282-282828282828",
        ...input,
        proposedQuantity: input.proposedQuantity ?? null,
        proposedLocation: input.proposedLocation ?? null,
        proposedStatus: input.proposedStatus ?? null,
        reviewStatus: "pending",
      });
      changeRequests.unshift(request);
      return request;
    },
    async reviewChangeRequest(id, input) {
      const index = changeRequests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      const reviewed = {
        ...changeRequests[index],
        reviewStatus: input.reviewStatus,
        reviewedByEmployeeId: input.reviewedByEmployeeId ?? null,
        reviewedByEmployeeName: input.reviewedByEmployeeName ?? null,
        reviewedAt: now,
        reviewRemark: input.reviewRemark ?? null,
        updatedAt: now,
      };
      changeRequests[index] = reviewed;
      if (input.reviewStatus === "approved") {
        if (reviewed.equipmentId) {
          const equipmentIndex = equipment.findIndex((item) => item.id === reviewed.equipmentId);
          if (equipmentIndex !== -1) {
            equipment[equipmentIndex] = {
              ...equipment[equipmentIndex],
              ...(reviewed.proposedQuantity !== null && reviewed.proposedQuantity !== undefined
                ? { quantity: reviewed.proposedQuantity }
                : {}),
              ...(reviewed.proposedLocation !== null && reviewed.proposedLocation !== undefined
                ? { location: reviewed.proposedLocation }
                : {}),
              ...(reviewed.proposedStatus ? { status: reviewed.proposedStatus } : {}),
              updatedAt: now,
            };
          }
        } else if (reviewed.changeType === "add") {
          equipment.unshift(
            makeKitchenEquipment({
              id: "29292929-2929-4292-8292-292929292929",
              projectSiteId: reviewed.projectSiteId,
              projectSiteName: reviewed.projectSiteName,
              equipmentName: reviewed.equipmentName,
              quantity: reviewed.proposedQuantity ?? 1,
              location: reviewed.proposedLocation,
              status: reviewed.proposedStatus ?? "in_use",
              attachmentPath: reviewed.attachmentPath,
              remark: reviewed.description,
            }),
          );
        }
      }
      return reviewed;
    },
  };
}

function createFakeMaterialRepository(seed: MaterialDto[] = []): MaterialRepository {
  const materials = [...seed];
  return {
    async list(filters) {
      return materials.filter((material) => {
        const matchesStatus = filters.status ? material.status === filters.status : true;
        const matchesQuery = filters.q
          ? [material.materialCode, material.materialName].some((value) =>
              value.toLowerCase().includes(filters.q!.toLowerCase()),
            )
          : true;
        return matchesStatus && matchesQuery;
      });
    },
    async getById(id) {
      return materials.find((material) => material.id === id) ?? null;
    },
    async create() {
      throw new Error("not needed");
    },
    async update() {
      throw new Error("not needed");
    },
  };
}

function createFakeWarehouseRepository(seed: WarehouseDto[] = []): WarehouseRepository {
  const warehouses = [...seed];
  return {
    async list(filters) {
      return warehouses.filter((warehouse) => (filters.status ? warehouse.status === filters.status : true));
    },
    async getById(id) {
      return warehouses.find((warehouse) => warehouse.id === id) ?? null;
    },
    async create() {
      throw new Error("not needed");
    },
    async update() {
      throw new Error("not needed");
    },
  };
}

function createFakeUsageRepository(
  seed: ProjectUsageRequestDto[] = [],
  options: { unitChargePrice?: number | null; chargeRemark?: string | null } = {},
): ProjectUsageRequestRepository {
  const requests = [...seed];
  let stock = 20;

  return {
    async list(filters) {
      return requests.filter((request) => {
        const matchesStatus = filters.status ? request.status === filters.status : true;
        const matchesSite = filters.projectSiteId ? request.projectSiteId === filters.projectSiteId : true;
        const matchesScopedSites = (filters as { projectSiteIds?: string[] }).projectSiteIds?.length
          ? (filters as { projectSiteIds: string[] }).projectSiteIds.includes(request.projectSiteId)
          : true;
        const matchesWarehouse = filters.warehouseId ? request.warehouseId === filters.warehouseId : true;
        const matchesMaterial = filters.materialId ? request.materialId === filters.materialId : true;
        const matchesQuery = filters.q
          ? [request.requestNo, request.projectSiteName, request.materialCode, request.materialName]
              .some((value) => value.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return matchesStatus && matchesSite && matchesScopedSites && matchesWarehouse && matchesMaterial && matchesQuery;
      });
    },
    async getById(id) {
      return requests.find((request) => request.id === id) ?? null;
    },
    async create(input: CreateProjectUsageRequestInput) {
      if (requests.some((request) => request.requestNo === input.requestNo)) {
        throw new ProjectUsageRequestConflictError("requestNo");
      }
      const request = makeUsageRequest({
        id: "77777777-7777-4777-8777-777777777777",
        ...input,
        status: input.status ?? "pending",
        issuedQuantity: 0,
      });
      requests.unshift(request);
      return request;
    },
    async update(id: string, input: UpdateProjectUsageRequestInput) {
      const index = requests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      requests[index] = { ...requests[index], ...input, updatedAt: now };
      return requests[index];
    },
    async issue(id: string, input: IssueProjectUsageRequestInput) {
      const index = requests.findIndex((request) => request.id === id);
      if (index === -1) return null;
      if (requests[index].status === "rejected" || requests[index].status === "issued") {
        throw new ProjectUsageRequestValidationError(["request is not open for issue"]);
      }
      if (input.outboundNo === "OUT-DUP") throw new ProjectUsageRequestConflictError("outboundNo");
      if (input.quantity > stock) throw new ProjectUsageRequestValidationError(["insufficient stock for issue"]);
      stock -= input.quantity;
      const unitChargePrice = options.unitChargePrice ?? null;
      const chargeAmount = typeof unitChargePrice === "number" ? Number((unitChargePrice * input.quantity).toFixed(4)) : 0;
      const nextIssuedQuantity = requests[index].issuedQuantity + input.quantity;
      const target = requests[index].approvedQuantity ?? requests[index].requestedQuantity;
      requests[index] = {
        ...requests[index],
        issuedQuantity: nextIssuedQuantity,
        outboundNo: input.outboundNo,
        unitChargePrice,
        chargeAmount: Number(((requests[index].chargeAmount ?? 0) + chargeAmount).toFixed(4)),
        chargePriceSource: typeof unitChargePrice === "number" ? "project_site_price" : null,
        chargeRemark: options.chargeRemark ?? null,
        lastIssuedAt: input.movementDate,
        lastReceivedByName: input.receivedByName ?? null,
        status: nextIssuedQuantity >= target ? "issued" : "partially_issued",
        updatedAt: now,
      };
      return requests[index];
    },
  };
}

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    username: "site-user",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: "44444444-4444-4444-8444-444444444444",
    employeeNo: "EMP0001",
    employeeName: "张三",
    employeeStatus: "active",
    roles: ["project_site"],
    assignedProjectSiteIds: ["11111111-1111-4111-8111-111111111111"],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExternalProjectSiteAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return makeAuthAccount({
    id: "abababab-abab-4bab-8bab-abababababab",
    username: "site-manager",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["external_project_site"],
    assignedProjectSiteIds: ["11111111-1111-4111-8111-111111111111"],
    externalProjectSiteContactName: "王项目",
    externalProjectSiteContactPhone: "13900000000",
    ...overrides,
  });
}

function createFakeAuthRepository(seed: AuthAccountRecord[]): AuthRepository {
  const accounts = [...seed];
  return {
    ...createFakeAuthSessionMethods(),
    async findByUsername(username) {
      return accounts.find((account) => account.username === username) ?? null;
    },
    async findById(id) {
      return accounts.find((account) => account.id === id) ?? null;
    },
    async updateLastLogin(id, at) {
      const account = accounts.find((item) => item.id === id);
      if (account) account.lastLoginAt = at.toISOString();
    },
  };
}

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username = "site-user", password = "ChangeMe123!") {
  const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { username, password } });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("project site API", () => {
  it("reports project site API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/project-sites" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, filters, and returns project site detail", async () => {
    const app = await buildApp({ projectSiteRepository: createFakeProjectSiteRepository([makeProjectSite()]) });

    const list = await app.inject({ method: "GET", url: "/api/project-sites?status=active&q=科技园" });
    const detail = await app.inject({
      method: "GET",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111",
    });
    const investmentSummary = await app.inject({
      method: "GET",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111/investment-summary",
    });
    const missing = await app.inject({ method: "GET", url: "/api/project-sites/missing" });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ projectSites: [{ siteCode: "SITE-WX-001", siteName: "科技园一期项目点" }] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ projectSite: { clientPartyName: "无锡科技园服务单位" } });
    expect(investmentSummary.statusCode).toBe(200);
    expect(investmentSummary.json()).toMatchObject({
      investmentSummary: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        contractCount: 4,
        totalAmount: 260000,
        categories: expect.arrayContaining([{ investmentCategory: "renovation", contractCount: 1, totalAmount: 90000 }]),
      },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("creates and updates project sites and rejects duplicates or invalid service modes", async () => {
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      projectSiteRepository: createFakeProjectSiteRepository([makeProjectSite()]),
      auditLogRepository,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/project-sites",
      payload: {
        siteCode: "SITE-WX-002",
        siteName: "滨江项目点",
        serviceMode: "subcontracted",
        subcontractorPartyId: "88888888-8888-4888-8888-888888888888",
        region: "无锡",
      },
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/project-sites",
      payload: { siteCode: "SITE-WX-003", siteName: "直营错误项目", serviceMode: "direct", subcontractorPartyId: "x" },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-sites",
      payload: { siteCode: "SITE-WX-001", siteName: "重复项目点" },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111",
      payload: { status: "paused", remark: "暂停服务" },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ projectSite: { siteCode: "SITE-WX-002", serviceMode: "subcontracted" } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().issues).toContain("direct project sites cannot have subcontractorPartyId");
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "PROJECT_SITE_CONFLICT", field: "siteCode" });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ projectSite: { status: "paused", remark: "暂停服务" } });
    expect(logs.map((log) => log.action)).toEqual(["project_site.create", "project_site.update"]);
    expect(logs.at(0)).toMatchObject({ entityType: "project_site", entityId: created.json().projectSite.id });
  });

  it("manages project-site compliance roster, insurance, payroll attachments, and summary", async () => {
    const repository = createFakeComplianceRepository();
    const app = await buildApp({
      projectSiteRepository: createFakeProjectSiteRepository([makeProjectSite({ payrollAgencyRequired: true })]),
      projectSiteComplianceRepository: repository,
    });

    const rosterList = await app.inject({
      method: "GET",
      url: "/api/project-site-roster-persons?projectSiteId=11111111-1111-4111-8111-111111111111&status=active",
    });
    const createdRosterPerson = await app.inject({
      method: "POST",
      url: "/api/project-site-roster-persons",
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        personName: "赵新员工",
        phone: "13800002222",
        identityNoLast4: "5678",
        workerType: "subcontractor_site_staff",
        jobRole: "帮厨",
        startDate: "2026-05-13",
      },
    });
    const createdPolicy = await app.inject({
      method: "POST",
      url: "/api/employer-liability-insurance-policies",
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        policyNo: "ELI202605002",
        insurerName: "平安保险",
        startDate: "2026-05-13",
        endDate: "2027-05-12",
        attachmentPath: "legacy-fixtures/insurance/ELI202605002.pdf",
      },
    });
    const createdCoverage = await app.inject({
      method: "POST",
      url: "/api/employer-liability-insurance-covered-persons",
      payload: {
        policyId: "18181818-1818-4181-8181-181818181818",
        rosterPersonId: "17171717-1717-4171-8171-171717171717",
        coveredNameSnapshot: "赵新员工",
        identityNoLast4Snapshot: "5678",
      },
    });
    const createdPayroll = await app.inject({
      method: "POST",
      url: "/api/project-site-payroll-submissions",
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        payrollMonth: "2026-05",
        attachmentPath: "legacy-fixtures/payroll/SITE-WX-001-2026-05.xlsx",
        submittedBy: "项目点负责人",
      },
    });
    const summary = await app.inject({
      method: "GET",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111/compliance-summary",
    });
    await app.close();

    expect(rosterList.statusCode).toBe(200);
    expect(rosterList.json()).toMatchObject({ rosterPeople: [{ personName: "王现场", status: "active" }] });
    expect(createdRosterPerson.statusCode).toBe(201);
    expect(createdRosterPerson.json()).toMatchObject({
      rosterPerson: { personName: "赵新员工", workerType: "subcontractor_site_staff", status: "active" },
    });
    expect(createdPolicy.statusCode).toBe(201);
    expect(createdPolicy.json()).toMatchObject({ insurancePolicy: { policyNo: "ELI202605002" } });
    expect(createdCoverage.statusCode).toBe(201);
    expect(createdCoverage.json()).toMatchObject({ coveredPerson: { coveredNameSnapshot: "赵新员工" } });
    expect(createdPayroll.statusCode).toBe(201);
    expect(createdPayroll.json()).toMatchObject({ payrollSubmission: { payrollMonth: "2026-05", reviewStatus: "pending" } });
    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toMatchObject({
      complianceSummary: {
        activeRosterCount: 2,
        missingHealthCertificateCount: 1,
        insuranceUncoveredActiveRosterCount: 1,
        foodOperationLicenseStatus: "expiring_soon",
        payrollCurrentMonthStatus: "pending",
      },
    });
  });
});

describe("project usage request API", () => {
  it("reports usage API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/project-usage-requests" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, filters, and returns usage request detail", async () => {
    const app = await buildApp({ projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]) });

    const list = await app.inject({ method: "GET", url: "/api/project-usage-requests?status=pending&q=MAT0001" });
    const detail = await app.inject({
      method: "GET",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555",
    });
    const missing = await app.inject({ method: "GET", url: "/api/project-usage-requests/missing" });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ projectUsageRequests: [{ requestNo: "USE20260511001" }] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ projectUsageRequest: { materialCode: "MAT0001" } });
    expect(missing.statusCode).toBe(404);
  });

  it("creates and updates usage requests and rejects invalid quantities or duplicates", async () => {
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]),
      auditLogRepository,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      payload: {
        requestNo: "USE20260511002",
        requestDate: "2026-05-11",
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 3,
        unit: "套",
      },
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      payload: { requestNo: "USE20260511003", requestDate: "2026-05-11", requestedQuantity: 0 },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      payload: {
        requestNo: "USE20260511001",
        requestDate: "2026-05-11",
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
      },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555",
      payload: { status: "rejected", remark: "库存暂缓" },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ projectUsageRequest: { requestNo: "USE20260511002", status: "pending" } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().issues).toEqual(
      expect.arrayContaining(["requestedQuantity must be a positive number", "projectSiteId is required"]),
    );
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "PROJECT_USAGE_CONFLICT", field: "requestNo" });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ projectUsageRequest: { status: "rejected", remark: "库存暂缓" } });
    expect(logs.map((log) => log.action)).toEqual(["project_usage_request.create", "project_usage_request.reject"]);
    expect(logs.at(-1)).toMatchObject({
      entityType: "project_usage_request",
      entityId: "55555555-5555-4555-8555-555555555555",
    });
  });

  it("issues usage requests and blocks insufficient stock or duplicate outbound numbers", async () => {
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]),
      auditLogRepository,
    });

    const partial = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT20260511001", movementDate: "2026-05-11", quantity: 4, handledBy: "王仓管" },
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT-DUP", movementDate: "2026-05-11", quantity: 1 },
    });
    const insufficient = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT20260511002", movementDate: "2026-05-11", quantity: 30 },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(partial.statusCode).toBe(201);
    expect(partial.json()).toMatchObject({
      projectUsageRequest: { outboundNo: "OUT20260511001", issuedQuantity: 4, status: "partially_issued" },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({ error: "PROJECT_USAGE_CONFLICT", field: "outboundNo" });
    expect(insufficient.statusCode).toBe(400);
    expect(insufficient.json().issues).toContain("insufficient stock for issue");
    expect(logs.at(-1)).toMatchObject({
      action: "project_usage_request.issue",
      entityType: "project_usage_request",
      entityId: "55555555-5555-4555-8555-555555555555",
    });
  });

  it("records project usage charge snapshots when issuing requests", async () => {
    const app = await buildApp({
      projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()], {
        unitChargePrice: 35.5,
        chargeRemark: "项目点领用收费价",
      }),
    });

    const firstIssue = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: {
        outboundNo: "OUT20260511003",
        movementDate: "2026-05-11",
        quantity: 4,
        handledBy: "王仓管",
        receivedByName: "项目点领用人",
      },
    });
    const secondIssue = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: {
        outboundNo: "OUT20260511004",
        movementDate: "2026-05-12",
        quantity: 6,
        handledBy: "王仓管",
        receivedByName: "项目点二次领用人",
      },
    });
    await app.close();

    expect(firstIssue.statusCode).toBe(201);
    expect(firstIssue.json()).toMatchObject({
      projectUsageRequest: {
        issuedQuantity: 4,
        chargeAmount: 142,
        unitChargePrice: 35.5,
        chargePriceSource: "project_site_price",
        chargeRemark: "项目点领用收费价",
        lastIssuedAt: "2026-05-11",
        lastReceivedByName: "项目点领用人",
        status: "partially_issued",
      },
    });
    expect(secondIssue.statusCode).toBe(201);
    expect(secondIssue.json()).toMatchObject({
      projectUsageRequest: {
        issuedQuantity: 10,
        chargeAmount: 355,
        lastIssuedAt: "2026-05-12",
        lastReceivedByName: "项目点二次领用人",
        status: "issued",
      },
    });
  });

  it("allows issuing non-charge usage requests without blocking outbound flow", async () => {
    const app = await buildApp({ projectUsageRequestRepository: createFakeUsageRepository([makeUsageRequest()]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests/55555555-5555-4555-8555-555555555555/issue",
      payload: { outboundNo: "OUT20260511005", movementDate: "2026-05-11", quantity: 2 },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      projectUsageRequest: {
        issuedQuantity: 2,
        chargeAmount: 0,
        unitChargePrice: null,
        chargePriceSource: null,
      },
    });
  });

  it("scopes project-site-only users to assigned sites and blocks issue execution", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedSite = makeProjectSite();
    const unassignedSite = makeProjectSite({
      id: "22222222-2222-4222-8222-222222222222",
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
    });
    const assignedUsage = makeUsageRequest();
    const unassignedUsage = makeUsageRequest({
      id: "88888888-8888-4888-8888-888888888888",
      requestNo: "USE20260511002",
      projectSiteId: unassignedSite.id,
      projectSiteName: unassignedSite.siteName,
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash })]),
      projectSiteRepository: createFakeProjectSiteRepository([assignedSite, unassignedSite]),
      projectUsageRequestRepository: createFakeUsageRepository([assignedUsage, unassignedUsage]),
    });
    const cookie = await loginCookie(app);

    const siteList = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    const unassignedSiteDetail = await app.inject({
      method: "GET",
      url: `/api/project-sites/${unassignedSite.id}`,
      cookies: { company_erp_session: cookie },
    });
    const usageList = await app.inject({ method: "GET", url: "/api/project-usage-requests", cookies: { company_erp_session: cookie } });
    const createAssigned = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511003",
        requestDate: "2026-05-11",
        projectSiteId: assignedSite.id,
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
      },
    });
    const createUnassigned = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511004",
        requestDate: "2026-05-11",
        projectSiteId: unassignedSite.id,
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
      },
    });
    const createIssued = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511005",
        requestDate: "2026-05-11",
        projectSiteId: assignedSite.id,
        warehouseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        materialId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requestedQuantity: 1,
        unit: "套",
        status: "issued",
      },
    });
    const issue = await app.inject({
      method: "POST",
      url: `/api/project-usage-requests/${assignedUsage.id}/issue`,
      cookies: { company_erp_session: cookie },
      payload: { outboundNo: "OUT20260511001", movementDate: "2026-05-11", quantity: 1 },
    });
    await app.close();

    expect(siteList.json()).toMatchObject({ projectSites: [{ id: assignedSite.id }] });
    expect(JSON.stringify(siteList.json())).not.toContain(unassignedSite.siteCode);
    expect(unassignedSiteDetail.statusCode).toBe(404);
    expect(usageList.json()).toMatchObject({ projectUsageRequests: [{ id: assignedUsage.id }] });
    expect(JSON.stringify(usageList.json())).not.toContain(unassignedUsage.requestNo);
    expect(createAssigned.statusCode).toBe(201);
    expect(createUnassigned.statusCode).toBe(404);
    expect(createIssued.statusCode).toBe(400);
    expect(issue.statusCode).toBe(403);
  });

  it("returns no project data for project-site users with no active assignments", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedSite = makeProjectSite();
    const assignedUsage = makeUsageRequest();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-empty-scope" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ passwordHash, assignedProjectSiteIds: [] })]),
      projectSiteRepository: createFakeProjectSiteRepository([assignedSite]),
      projectUsageRequestRepository: createFakeUsageRepository([assignedUsage]),
    });
    const cookie = await loginCookie(app);

    const siteList = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    const siteDetail = await app.inject({
      method: "GET",
      url: `/api/project-sites/${assignedSite.id}`,
      cookies: { company_erp_session: cookie },
    });
    const usageList = await app.inject({ method: "GET", url: "/api/project-usage-requests", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(siteList.json()).toEqual({ projectSites: [] });
    expect(siteDetail.statusCode).toBe(404);
    expect(usageList.json()).toEqual({ projectUsageRequests: [] });
  });

  it("rejects historical multi-role project-site users before they can read global project sites", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const firstSite = makeProjectSite();
    const secondSite = makeProjectSite({
      id: "22222222-2222-4222-8222-222222222222",
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-mixed-role-scope" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ passwordHash, roles: ["project_site", "hr"], assignedProjectSiteIds: [] }),
      ]),
      projectSiteRepository: createFakeProjectSiteRepository([firstSite, secondSite]),
    });
    const cookie = await loginCookie(app);

    const siteList = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(cookie).toBe("");
    expect(siteList.statusCode).toBe(401);
    expect(siteList.json()).toEqual({ error: "AUTH_REQUIRED" });
  });

  it("derives project-site scopes from scoped roles even when a defensive caller receives extra roles", () => {
    const assignedProjectSiteIds = ["11111111-1111-4111-8111-111111111111"];
    const request = { currentUser: { roles: ["external_project_site", "viewer"], assignedProjectSiteIds } };

    expect(scopedProjectSiteIds(request)).toEqual(assignedProjectSiteIds);
    expect(externalProjectSiteAccountSiteIds(request)).toEqual(assignedProjectSiteIds);
  });

  it("allows operations to submit usage requests but blocks warehouse issue execution", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const usageRequest = makeUsageRequest();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-operations-usage" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ passwordHash, roles: ["operations"], assignedProjectSiteIds: [] }),
      ]),
      projectUsageRequestRepository: createFakeUsageRepository([usageRequest], {
        unitChargePrice: 35.5,
        chargeRemark: "项目点领用收费价",
      }),
    });
    const cookie = await loginCookie(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511006",
        requestDate: "2026-05-11",
        projectSiteId: usageRequest.projectSiteId,
        warehouseId: usageRequest.warehouseId,
        materialId: usageRequest.materialId,
        requestedQuantity: 2,
        unit: "套",
      },
    });
    const issue = await app.inject({
      method: "POST",
      url: `/api/project-usage-requests/${usageRequest.id}/issue`,
      cookies: { company_erp_session: cookie },
      payload: { outboundNo: "OUT20260511099", movementDate: "2026-05-11", quantity: 1 },
    });
    await app.close();

    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      projectUsageRequest: { requestNo: "USE20260511006", status: "pending" },
    });
    expect(JSON.stringify(create.json())).not.toContain("unitChargePrice");
    expect(JSON.stringify(create.json())).not.toContain("chargeAmount");
    expect(issue.statusCode).toBe(403);
    expect(issue.json()).toMatchObject({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "manage" });
  });

  it("lets external project-site accounts create only assigned-site usage requests with submitter snapshots", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const assignedSite = makeProjectSite();
    const unassignedSite = makeProjectSite({
      id: "22222222-2222-4222-8222-222222222222",
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
    });
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-external-manager" },
      authRepository: createFakeAuthRepository([makeExternalProjectSiteAuthAccount({ passwordHash })]),
      projectSiteRepository: createFakeProjectSiteRepository([assignedSite, unassignedSite]),
      projectUsageRequestRepository: createFakeUsageRepository([]),
      materialRepository: createFakeMaterialRepository([makeMaterial()]),
      warehouseRepository: createFakeWarehouseRepository([makeWarehouse()]),
    });
    const cookie = await loginCookie(app, "site-manager");

    const me = await app.inject({ method: "GET", url: "/api/auth/me", cookies: { company_erp_session: cookie } });
    const options = await app.inject({ method: "GET", url: "/api/project-usage-options", cookies: { company_erp_session: cookie } });
    const create = await app.inject({
      method: "POST",
      url: "/api/project-usage-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        requestNo: "USE20260511007",
        requestDate: "2026-05-11",
        projectSiteId: unassignedSite.id,
        warehouseId,
        materialId,
        requestedQuantity: 2,
        unit: "套",
        status: "issued",
      },
    });
    const partyAccess = await app.inject({ method: "GET", url: "/api/parties", cookies: { company_erp_session: cookie } });
    const contractAccess = await app.inject({ method: "GET", url: "/api/contracts", cookies: { company_erp_session: cookie } });
    const inventoryAccess = await app.inject({ method: "GET", url: "/api/inventory-balances", cookies: { company_erp_session: cookie } });
    const projectSiteAccess = await app.inject({ method: "GET", url: "/api/project-sites", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(me.json()).toMatchObject({
      user: {
        roles: ["external_project_site"],
        assignedProjectSiteIds: [assignedSite.id],
        externalProjectSiteContactName: "王项目",
      },
    });
    expect(options.statusCode).toBe(200);
    expect(options.json()).toMatchObject({
      defaultWarehouse: { id: warehouseId, warehouseCode: "WH-WX-HQ" },
      materials: [{ id: materialId, materialCode: "MAT0001", unit: "套" }],
    });
    expect(JSON.stringify(options.json())).not.toContain("currentQuantity");
    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      projectUsageRequest: {
        requestNo: "USE20260511007",
        projectSiteId: assignedSite.id,
        status: "pending",
        submittedByAccountId: "abababab-abab-4bab-8bab-abababababab",
        submittedByNameSnapshot: "王项目",
        submittedByPhoneSnapshot: "13900000000",
      },
    });
    expect(partyAccess.statusCode).toBe(403);
    expect(contractAccess.statusCode).toBe(403);
    expect(inventoryAccess.statusCode).toBe(403);
    expect(projectSiteAccess.statusCode).toBe(403);
  });

  it("lets external project-site accounts submit only assigned-site compliance records", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-external-compliance" },
      authRepository: createFakeAuthRepository([makeExternalProjectSiteAuthAccount({ passwordHash })]),
      projectSiteComplianceRepository: createFakeComplianceRepository(),
      projectSiteRepository: createFakeProjectSiteRepository([
        makeProjectSite(),
        makeProjectSite({
          id: "22222222-2222-4222-8222-222222222222",
          siteCode: "SITE-WX-002",
          siteName: "滨江项目点",
        }),
      ]),
    });
    const cookie = await loginCookie(app, "site-manager");

    const assignedRoster = await app.inject({
      method: "POST",
      url: "/api/project-site-roster-persons",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        personName: "赵新员工",
        workerType: "subcontractor_site_staff",
      },
    });
    const unassignedRoster = await app.inject({
      method: "POST",
      url: "/api/project-site-roster-persons",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "22222222-2222-4222-8222-222222222222",
        personName: "越权人员",
        workerType: "subcontractor_site_staff",
      },
    });
    const assignedPolicy = await app.inject({
      method: "POST",
      url: "/api/employer-liability-insurance-policies",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        policyNo: "ELI202605002",
        insurerName: "平安保险",
        startDate: "2026-05-13",
        endDate: "2027-05-12",
      },
    });
    const assignedCoveredPerson = await app.inject({
      method: "POST",
      url: "/api/employer-liability-insurance-covered-persons",
      cookies: { company_erp_session: cookie },
      payload: {
        policyId: "13131313-1313-4131-8131-131313131313",
        rosterPersonId: "12121212-1212-4121-8121-121212121212",
        coveredNameSnapshot: "王现场",
      },
    });
    const unassignedPolicyCoveredPerson = await app.inject({
      method: "POST",
      url: "/api/employer-liability-insurance-covered-persons",
      cookies: { company_erp_session: cookie },
      payload: {
        policyId: "31313131-3131-4313-8313-313131313131",
        rosterPersonId: "12121212-1212-4121-8121-121212121212",
        coveredNameSnapshot: "王现场",
      },
    });
    const unassignedRosterCoveredPerson = await app.inject({
      method: "POST",
      url: "/api/employer-liability-insurance-covered-persons",
      cookies: { company_erp_session: cookie },
      payload: {
        policyId: "13131313-1313-4131-8131-131313131313",
        rosterPersonId: "30303030-3030-4303-8303-303030303030",
        coveredNameSnapshot: "周外场",
      },
    });
    const assignedPayroll = await app.inject({
      method: "POST",
      url: "/api/project-site-payroll-submissions",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        payrollMonth: "2026-05",
      },
    });
    const payrollWithStorageKey = await app.inject({
      method: "POST",
      url: "/api/project-site-payroll-submissions",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        payrollMonth: "2026-06",
        storageKey: "project-sites/payroll.xlsx",
      },
    });
    const updateProjectSite = await app.inject({
      method: "PATCH",
      url: "/api/project-sites/11111111-1111-4111-8111-111111111111",
      cookies: { company_erp_session: cookie },
      payload: { remark: "不能改主数据" },
    });
    await app.close();

    expect(assignedRoster.statusCode).toBe(201);
    expect(unassignedRoster.statusCode).toBe(404);
    expect(assignedPolicy.statusCode).toBe(201);
    expect(assignedCoveredPerson.statusCode).toBe(201);
    expect(unassignedPolicyCoveredPerson.statusCode).toBe(404);
    expect(unassignedRosterCoveredPerson.statusCode).toBe(404);
    expect(assignedPayroll.statusCode).toBe(201);
    expect(assignedPayroll.json()).toMatchObject({
      payrollSubmission: { attachmentPath: "unified-attachment-pending", reviewStatus: "pending" },
    });
    expect(payrollWithStorageKey.statusCode).toBe(400);
    expect(payrollWithStorageKey.json().issues).toContain("storageKey is not accepted for payroll submissions");
    expect(updateProjectSite.statusCode).toBe(403);
  });

  it("lists employer liability insurance covered persons with project-site scope", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const projectSiteComplianceRepository = createFakeComplianceRepository();
    const listCoveredPeople = vi.spyOn(projectSiteComplianceRepository, "listCoveredPeople");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-covered-person-list" },
      authRepository: createFakeAuthRepository([makeExternalProjectSiteAuthAccount({ passwordHash })]),
      projectSiteComplianceRepository,
    });
    const cookie = await loginCookie(app, "site-manager");

    const assignedByPolicy = await app.inject({
      method: "GET",
      url: `/api/employer-liability-insurance-covered-persons?policyId=${insurancePolicyId}`,
      cookies: { company_erp_session: cookie },
    });
    const assignedBySite = await app.inject({
      method: "GET",
      url: "/api/employer-liability-insurance-covered-persons?projectSiteId=11111111-1111-4111-8111-111111111111",
      cookies: { company_erp_session: cookie },
    });
    const unassignedBySite = await app.inject({
      method: "GET",
      url: "/api/employer-liability-insurance-covered-persons?projectSiteId=22222222-2222-4222-8222-222222222222",
      cookies: { company_erp_session: cookie },
    });
    const unassignedByPolicy = await app.inject({
      method: "GET",
      url: "/api/employer-liability-insurance-covered-persons?policyId=31313131-3131-4313-8313-313131313131",
      cookies: { company_erp_session: cookie },
    });
    await app.close();

    expect(listCoveredPeople).toHaveBeenCalledWith(expect.objectContaining({ policyId: insurancePolicyId }));
    expect(assignedByPolicy.statusCode).toBe(200);
    expect(assignedByPolicy.json()).toMatchObject({
      coveredPersons: [{ policyId: insurancePolicyId, coveredNameSnapshot: "王现场" }],
    });
    expect(assignedBySite.statusCode).toBe(200);
    expect(assignedBySite.json()).toMatchObject({
      coveredPersons: [{ policyId: insurancePolicyId, rosterPersonName: "王现场" }],
    });
    expect(unassignedBySite.statusCode).toBe(200);
    expect(unassignedBySite.json()).toEqual({ coveredPersons: [] });
    expect(unassignedByPolicy.statusCode).toBe(200);
    expect(unassignedByPolicy.json()).toEqual({ coveredPersons: [] });
  });
});

describe("project-site kitchen equipment API", () => {
  it("lets headquarters maintain project-site kitchen equipment without inventory movement", async () => {
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      projectSiteKitchenEquipmentRepository: createFakeKitchenEquipmentRepository(),
      auditLogRepository,
    });

    const list = await app.inject({ method: "GET", url: "/api/project-site-kitchen-equipment?projectSiteId=11111111-1111-4111-8111-111111111111" });
    const created = await app.inject({
      method: "POST",
      url: "/api/project-site-kitchen-equipment",
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        equipmentName: "单头大锅灶",
        equipmentCategory: "灶具",
        quantity: 1,
        unit: "台",
        location: "热厨区",
        sourceContractId: "33333333-3333-4333-8333-333333333333",
        attachmentPath: "legacy-fixtures/equipment/stove.jpg",
      },
    });
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/project-site-kitchen-equipment/${kitchenEquipmentId}`,
      payload: { status: "damaged", location: "待维修区", attachmentPath: "legacy-fixtures/equipment/damaged.jpg" },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      kitchenEquipment: [{ id: kitchenEquipmentId, equipmentName: "六门冰柜", quantity: 2, status: "in_use" }],
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      kitchenEquipment: { equipmentName: "单头大锅灶", status: "in_use", quantity: 1 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      kitchenEquipment: { id: kitchenEquipmentId, status: "damaged", location: "待维修区" },
    });
    expect(logs.map((log) => log.action)).toEqual([
      "project_site_kitchen_equipment.create",
      "project_site_kitchen_equipment.update",
    ]);
    expect(logs.at(0)).toMatchObject({
      entityType: "project_site_kitchen_equipment",
      entityId: created.json().kitchenEquipment.id,
    });
    expect(JSON.stringify(logs)).not.toContain("/volume1");
    expect(JSON.stringify(logs)).not.toMatch(/password|secret|cookie|[0-9]{17}[\dXx]/);
  });

  it("fails closed when kitchen equipment audit logging is unavailable", async () => {
    const app = await buildApp({
      projectSiteKitchenEquipmentRepository: createFakeKitchenEquipmentRepository(),
      auditLogRepository: {
        async list() {
          return [];
        },
        async create() {
          throw new Error("audit unavailable");
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/project-site-kitchen-equipment",
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        equipmentName: "单头大锅灶",
        quantity: 1,
        unit: "台",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "AUDIT_LOG_WRITE_FAILED" });
  });

  it("scopes external project-site accounts to assigned-site equipment and pending change requests", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-external-equipment" },
      authRepository: createFakeAuthRepository([makeExternalProjectSiteAuthAccount({ passwordHash })]),
      projectSiteKitchenEquipmentRepository: createFakeKitchenEquipmentRepository(),
      contractRepository: undefined,
      inventoryRepository: undefined,
    });
    const cookie = await loginCookie(app, "site-manager");

    const list = await app.inject({
      method: "GET",
      url: "/api/project-site-kitchen-equipment",
      cookies: { company_erp_session: cookie },
    });
    const createDirectEquipment = await app.inject({
      method: "POST",
      url: "/api/project-site-kitchen-equipment",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        equipmentName: "绕过新增",
        quantity: 1,
        unit: "台",
      },
    });
    const report = await app.inject({
      method: "POST",
      url: "/api/project-site-kitchen-equipment-change-requests",
      cookies: { company_erp_session: cookie },
      payload: {
        projectSiteId: "22222222-2222-4222-8222-222222222222",
        equipmentId: kitchenEquipmentId,
        equipmentName: "六门冰柜",
        changeType: "status_change",
        proposedStatus: "repair_needed",
        description: "压缩机异响，需要维修",
      },
    });
    const requests = await app.inject({
      method: "GET",
      url: "/api/project-site-kitchen-equipment-change-requests",
      cookies: { company_erp_session: cookie },
    });
    const contractAccess = await app.inject({ method: "GET", url: "/api/contracts", cookies: { company_erp_session: cookie } });
    const inventoryAccess = await app.inject({ method: "GET", url: "/api/inventory-balances", cookies: { company_erp_session: cookie } });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json().kitchenEquipment).toHaveLength(1);
    expect(list.json()).toMatchObject({
      kitchenEquipment: [{ id: kitchenEquipmentId, projectSiteId: "11111111-1111-4111-8111-111111111111" }],
    });
    expect(JSON.stringify(list.json())).not.toContain("滨江项目点");
    expect(createDirectEquipment.statusCode).toBe(403);
    expect(report.statusCode).toBe(201);
    expect(report.json()).toMatchObject({
      kitchenEquipmentChangeRequest: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        reviewStatus: "pending",
        submittedByAccountId: "abababab-abab-4bab-8bab-abababababab",
        submittedByNameSnapshot: "王项目",
        submittedByPhoneSnapshot: "13900000000",
      },
    });
    expect(requests.statusCode).toBe(200);
    expect(requests.json().kitchenEquipmentChangeRequests.every((request: ProjectSiteKitchenEquipmentChangeRequestDto) => request.projectSiteId === "11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(contractAccess.statusCode).toBe(403);
    expect(inventoryAccess.statusCode).toBe(403);
  });

  it("applies approved equipment change requests and keeps rejected requests as history only", async () => {
    const repository = createFakeKitchenEquipmentRepository();
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({ projectSiteKitchenEquipmentRepository: repository, auditLogRepository });

    const approved = await app.inject({
      method: "POST",
      url: `/api/project-site-kitchen-equipment-change-requests/${kitchenEquipmentChangeRequestId}/review`,
      payload: { reviewStatus: "approved", reviewedByEmployeeId: "44444444-4444-4444-8444-444444444444", reviewedByEmployeeName: "张三" },
    });
    const afterApproved = await app.inject({ method: "GET", url: "/api/project-site-kitchen-equipment" });
    const addRequest = await app.inject({
      method: "POST",
      url: "/api/project-site-kitchen-equipment-change-requests",
      payload: {
        projectSiteId: "11111111-1111-4111-8111-111111111111",
        equipmentName: "双门消毒柜",
        changeType: "add",
        proposedQuantity: 1,
        proposedLocation: "备餐间",
        proposedStatus: "in_use",
        attachmentPath: "legacy-fixtures/equipment/disinfection.jpg",
      },
    });
    const rejected = await app.inject({
      method: "POST",
      url: `/api/project-site-kitchen-equipment-change-requests/${addRequest.json().kitchenEquipmentChangeRequest.id}/review`,
      payload: { reviewStatus: "rejected", reviewRemark: "重复上报" },
    });
    const afterRejected = await app.inject({ method: "GET", url: "/api/project-site-kitchen-equipment" });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      kitchenEquipmentChangeRequest: { id: kitchenEquipmentChangeRequestId, reviewStatus: "approved" },
    });
    expect(afterApproved.json()).toMatchObject({
      kitchenEquipment: expect.arrayContaining([
        expect.objectContaining({ id: kitchenEquipmentId, status: "repair_needed" }),
      ]),
    });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json()).toMatchObject({ kitchenEquipmentChangeRequest: { reviewStatus: "rejected" } });
    expect(JSON.stringify(afterRejected.json())).not.toContain("双门消毒柜");
    expect(logs.map((log) => log.action)).toEqual([
      "project_site_kitchen_equipment_change_request.review",
      "project_site_kitchen_equipment_change_request.create",
      "project_site_kitchen_equipment_change_request.review",
    ]);
    expect(logs.map((log) => log.entityType)).toEqual([
      "project_site_kitchen_equipment_change_request",
      "project_site_kitchen_equipment_change_request",
      "project_site_kitchen_equipment_change_request",
    ]);
    expect(logs.at(1)).toMatchObject({
      entityId: addRequest.json().kitchenEquipmentChangeRequest.id,
    });
    expect(JSON.stringify(logs)).not.toContain("/volume1");
    expect(JSON.stringify(logs)).not.toMatch(/password|secret|cookie|[0-9]{17}[\dXx]/);
  });
});
