import { describe, expect, it } from "vitest";
import type {
  CertificateRecordDto,
  CreateCertificateRecordInput,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto,
  ProjectSiteEmployerLiabilityInsurancePolicyDto,
  ProjectSitePayrollSubmissionDto,
  ProjectSiteRosterPersonDto,
  UpdateCertificateRecordInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import { certificateFiltersForRequest, isOutsideCertificateScope } from "../src/appRouteContext";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import {
  CertificateConflictError,
  getCertificateComputedStatus,
  type CertificateListFilters,
  type CertificateRepository,
} from "../src/certificates";
import { hashPassword } from "../src/password";
import type {
  CreateProjectSiteInsuranceCoveredPersonInput,
  CreateProjectSiteInsurancePolicyInput,
  CreateProjectSitePayrollSubmissionInput,
  CreateProjectSiteRosterPersonInput,
  ProjectSiteComplianceRepository,
  ProjectSiteInsuranceCoveredPersonListFilters,
  ProjectSiteInsurancePolicyListFilters,
  ProjectSitePayrollSubmissionListFilters,
  ProjectSiteRosterPersonListFilters,
} from "../src/projectSites";

const now = "2026-05-12T08:00:00.000Z";
const certificateId = "11111111-1111-4111-8111-111111111111";
const assignedProjectSiteId = "22222222-2222-4222-8222-222222222222";
const unassignedProjectSiteId = "33333333-3333-4333-8333-333333333333";
const assignedRosterPersonId = "55555555-5555-4555-8555-555555555555";
const unassignedRosterPersonId = "66666666-6666-4666-8666-666666666666";

function makeCertificate(overrides: Partial<CertificateRecordDto> = {}): CertificateRecordDto {
  return {
    id: certificateId,
    certificateCode: "CERT0001",
    certificateName: "项目点食品经营许可证",
    certificateType: "food_operation_license",
    ownerType: "project_site",
    ownerEmployeeId: null,
    ownerEmployeeName: null,
    ownerRosterPersonId: null,
    ownerRosterPersonName: null,
    ownerRosterPersonProjectSiteId: null,
    ownerProjectSiteId: assignedProjectSiteId,
    ownerProjectSiteName: "科技园一期项目点",
    ownerPartyId: null,
    ownerPartyName: null,
    ownerNameSnapshot: "科技园一期项目点",
    certificateNumber: "JY13202000000001",
    issuingAuthority: "市场监督管理局",
    certificateScope: "食堂经营",
    issueDate: "2026-01-01",
    validityType: "fixed_expiry",
    expiryDate: "2026-06-05",
    nextReviewDate: null,
    reminderDays: 30,
    computedStatus: "expiring_soon",
    isComplianceCritical: true,
    attachmentPath: "legacy-fixtures/certificates/CERT0001.pdf",
    sourceFilePath: "legacy-fixtures/certificates/source-pack.pdf",
    sourcePageNo: 3,
    responsibleEmployeeId: null,
    responsibleEmployeeName: null,
    confirmedByEmployeeId: null,
    confirmedByEmployeeName: null,
    confirmedAt: null,
    isDisabled: false,
    remark: "证照台账样例",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRosterPerson(overrides: Partial<ProjectSiteRosterPersonDto> = {}): ProjectSiteRosterPersonDto {
  return {
    id: assignedRosterPersonId,
    projectSiteId: assignedProjectSiteId,
    projectSiteName: "科技园一期项目点",
    personName: "王现场",
    phone: "13800001111",
    identityNoLast4: "1234",
    workerType: "subcontractor_site_staff",
    jobRole: "厨师",
    startDate: "2026-05-01",
    endDate: null,
    status: "active",
    sourceAttachmentPath: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeComplianceRepository(): ProjectSiteComplianceRepository {
  const rosterPeople = [
    makeRosterPerson(),
    makeRosterPerson({
      id: unassignedRosterPersonId,
      projectSiteId: unassignedProjectSiteId,
      projectSiteName: "滨江项目点",
      personName: "李现场",
    }),
  ];

  return {
    async listRosterPeople(filters: ProjectSiteRosterPersonListFilters) {
      return rosterPeople.filter((person) => {
        const matchesSite = filters.projectSiteId ? person.projectSiteId === filters.projectSiteId : true;
        const matchesScope = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(person.projectSiteId) : true;
        const matchesStatus = filters.status ? person.status === filters.status : true;
        return matchesSite && matchesScope && matchesStatus;
      });
    },
    async createRosterPerson(input: CreateProjectSiteRosterPersonInput) {
      const person = makeRosterPerson({ id: "77777777-7777-4777-8777-777777777777", ...input });
      rosterPeople.unshift(person);
      return person;
    },
    async listInsurancePolicies(_filters: ProjectSiteInsurancePolicyListFilters): Promise<ProjectSiteEmployerLiabilityInsurancePolicyDto[]> {
      return [];
    },
    async createInsurancePolicy(_input: CreateProjectSiteInsurancePolicyInput): Promise<ProjectSiteEmployerLiabilityInsurancePolicyDto> {
      throw new Error("not used");
    },
    async listCoveredPeople(_filters: ProjectSiteInsuranceCoveredPersonListFilters): Promise<ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto[]> {
      return [];
    },
    async createCoveredPerson(_input: CreateProjectSiteInsuranceCoveredPersonInput): Promise<ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto> {
      throw new Error("not used");
    },
    async listPayrollSubmissions(_filters: ProjectSitePayrollSubmissionListFilters): Promise<ProjectSitePayrollSubmissionDto[]> {
      return [];
    },
    async createPayrollSubmission(_input: CreateProjectSitePayrollSubmissionInput): Promise<ProjectSitePayrollSubmissionDto> {
      throw new Error("not used");
    },
    async getComplianceSummaries(_projectSiteIds?: readonly string[]): Promise<ProjectSiteComplianceSummaryDto[]> {
      return [];
    },
    async getComplianceSummary(_projectSiteId: string): Promise<ProjectSiteComplianceSummaryDto | null> {
      return null;
    },
  };
}

function createFakeCertificateRepository(seed: CertificateRecordDto[] = []): CertificateRepository {
  const records = [...seed];

  return {
    async list(filters: CertificateListFilters) {
      return records.filter((record) => {
        const matchesType = filters.type ? record.certificateType === filters.type : true;
        const matchesOwnerType = filters.ownerType ? record.ownerType === filters.ownerType : true;
        const matchesStatus = filters.computedStatus ? record.computedStatus === filters.computedStatus : true;
        const matchesResponsible = filters.responsibleEmployeeId
          ? record.responsibleEmployeeId === filters.responsibleEmployeeId
          : true;
        const matchesCritical =
          filters.isComplianceCritical === undefined
            ? true
            : record.isComplianceCritical === filters.isComplianceCritical;
        const matchesProjectSites = filters.projectSiteIds
          ? filters.projectSiteIds.includes(record.ownerProjectSiteId ?? "") ||
            filters.projectSiteIds.includes(record.ownerRosterPersonProjectSiteId ?? "")
          : true;
        const matchesOwnerTypes = filters.ownerTypes ? filters.ownerTypes.includes(record.ownerType) : true;
        const matchesQuery = filters.q
          ? [
              record.certificateCode,
              record.certificateName,
              record.ownerNameSnapshot,
              record.certificateNumber,
              record.issuingAuthority,
            ]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;
        return (
          matchesType &&
          matchesOwnerType &&
          matchesStatus &&
          matchesResponsible &&
          matchesCritical &&
          matchesProjectSites &&
          matchesOwnerTypes &&
          matchesQuery
        );
      });
    },
    async getById(id: string) {
      return records.find((record) => record.id === id) ?? null;
    },
    async create(input: CreateCertificateRecordInput) {
      if (records.some((record) => record.certificateCode === input.certificateCode)) {
        throw new CertificateConflictError("certificateCode");
      }
      const record = makeCertificate({
        id: "44444444-4444-4444-8444-444444444444",
        ...input,
        ownerEmployeeName: null,
        ownerRosterPersonName: input.ownerRosterPersonId ? "王现场" : null,
        ownerRosterPersonProjectSiteId: input.ownerRosterPersonId ? assignedProjectSiteId : null,
        ownerProjectSiteName: input.ownerProjectSiteId ? "科技园一期项目点" : null,
        ownerPartyName: input.ownerPartyId ? "供应商有限公司" : null,
        computedStatus: "valid",
        certificateNumber: input.certificateNumber ?? null,
        issuingAuthority: input.issuingAuthority ?? null,
        certificateScope: input.certificateScope ?? null,
        issueDate: input.issueDate ?? null,
        expiryDate: input.expiryDate ?? null,
        nextReviewDate: input.nextReviewDate ?? null,
        attachmentPath: input.attachmentPath ?? null,
        sourceFilePath: input.sourceFilePath ?? null,
        sourcePageNo: input.sourcePageNo ?? null,
        responsibleEmployeeId: input.responsibleEmployeeId ?? null,
        responsibleEmployeeName: null,
        confirmedByEmployeeId: input.confirmedByEmployeeId ?? null,
        confirmedByEmployeeName: null,
        confirmedAt: input.confirmedAt ?? null,
        isDisabled: input.isDisabled ?? false,
        remark: input.remark ?? null,
      });
      records.push(record);
      return record;
    },
    async update(id: string, input: UpdateCertificateRecordInput) {
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return null;
      records[index] = { ...records[index], ...input, updatedAt: now };
      return records[index];
    },
  };
}

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    username: "user",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    employeeNo: "EMP0001",
    employeeName: "张三",
    employeeStatus: "active",
    roles: ["project_site"],
    assignedProjectSiteIds: [assignedProjectSiteId],
    lastLoginAt: null,
    passwordChangedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExternalProjectSiteAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return makeAuthAccount({
    id: "edededed-eded-4ded-8ded-edededededed",
    username: "site-manager",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["external_project_site"],
    assignedProjectSiteIds: [assignedProjectSiteId],
    externalProjectSiteContactName: "王项目",
    externalProjectSiteContactPhone: "13900000000",
    ...overrides,
  });
}

function createFakeAuthRepository(seed: AuthAccountRecord[]): AuthRepository {
  const accounts = [...seed];
  return {
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

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username = "user") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("certificate status helper", () => {
  it("calculates expiry, review, archive, and disabled statuses", () => {
    const reference = new Date("2026-05-12T00:00:00.000Z");

    expect(getCertificateComputedStatus({ isDisabled: true, validityType: "fixed_expiry", expiryDate: "2026-12-31", nextReviewDate: null, reminderDays: 30 }, reference)).toBe("disabled");
    expect(getCertificateComputedStatus({ isDisabled: false, validityType: "fixed_expiry", expiryDate: "2026-05-01", nextReviewDate: null, reminderDays: 30 }, reference)).toBe("expired");
    expect(getCertificateComputedStatus({ isDisabled: false, validityType: "fixed_expiry", expiryDate: "2026-06-05", nextReviewDate: null, reminderDays: 30 }, reference)).toBe("expiring_soon");
    expect(getCertificateComputedStatus({ isDisabled: false, validityType: "long_term", expiryDate: null, nextReviewDate: "2026-05-01", reminderDays: 30 }, reference)).toBe("review_due");
    expect(getCertificateComputedStatus({ isDisabled: false, validityType: "no_expiry_visible", expiryDate: null, nextReviewDate: "2026-06-01", reminderDays: 30 }, reference)).toBe("review_due_soon");
    expect(getCertificateComputedStatus({ isDisabled: false, validityType: "no_expiry_visible", expiryDate: null, nextReviewDate: null, reminderDays: 30 }, reference)).toBe("archived");
  });
});

describe("certificates API", () => {
  it("reports certificates API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/certificates" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates certificate records", async () => {
    const repository = createFakeCertificateRepository([makeCertificate()]);
    const app = await buildApp({ certificateRepository: repository });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/certificates?type=food_operation_license&ownerType=project_site&computedStatus=expiring_soon&isComplianceCritical=true&q=食品",
    });
    const detailResponse = await app.inject({ method: "GET", url: `/api/certificates/${certificateId}` });
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT0002",
        certificateName: "员工健康证",
        certificateType: "person_health_cert",
        ownerType: "person",
        ownerEmployeeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ownerNameSnapshot: "张三",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
        reminderDays: 30,
        isComplianceCritical: true,
      },
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/certificates/${certificateId}`,
      payload: { nextReviewDate: "2026-08-01", remark: "已人工复核" },
    });
    await app.close();

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().certificates).toHaveLength(1);
    expect(detailResponse.json().certificate.certificateCode).toBe("CERT0001");
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().certificate.certificateCode).toBe("CERT0002");
    expect(updateResponse.json().certificate.remark).toBe("已人工复核");
  });

  it("creates a health certificate linked to a project-site roster person", async () => {
    const app = await buildApp({ certificateRepository: createFakeCertificateRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "HC-ROSTER-001",
        certificateName: "现场人员健康证",
        certificateType: "person_health_cert",
        ownerType: "person",
        ownerRosterPersonId: "55555555-5555-4555-8555-555555555555",
        ownerNameSnapshot: "王现场",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
        reminderDays: 30,
        isComplianceCritical: true,
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      certificate: {
        certificateCode: "HC-ROSTER-001",
        ownerType: "person",
        ownerEmployeeId: null,
        ownerRosterPersonId: "55555555-5555-4555-8555-555555555555",
        ownerRosterPersonName: "王现场",
        ownerRosterPersonProjectSiteId: assignedProjectSiteId,
      },
    });
  });

  it("accepts supplier, company, and project site certificates with their required owner links", async () => {
    const app = await buildApp({ certificateRepository: createFakeCertificateRepository() });

    const supplier = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-SUP-001",
        certificateName: "供应商资质",
        certificateType: "supplier_qualification",
        ownerType: "supplier",
        ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ownerNameSnapshot: "供应商有限公司",
        validityType: "long_term",
      },
    });
    const company = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-COMPANY-001",
        certificateName: "公司营业执照",
        certificateType: "business_license",
        ownerType: "company",
        ownerPartyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ownerNameSnapshot: "我方公司主体",
        validityType: "long_term",
      },
    });
    const projectSite = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-SITE-001",
        certificateName: "项目点食品许可证",
        certificateType: "food_operation_license",
        ownerType: "project_site",
        ownerProjectSiteId: assignedProjectSiteId,
        ownerNameSnapshot: "科技园一期项目点",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
      },
    });
    await app.close();

    expect(supplier.statusCode).toBe(201);
    expect(supplier.json()).toMatchObject({ certificate: { ownerType: "supplier", ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } });
    expect(company.statusCode).toBe(201);
    expect(company.json()).toMatchObject({ certificate: { ownerType: "company", ownerPartyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } });
    expect(projectSite.statusCode).toBe(201);
    expect(projectSite.json()).toMatchObject({ certificate: { ownerType: "project_site", ownerProjectSiteId: assignedProjectSiteId } });
  });

  it("accepts no-expiry-visible certificates without forcing a fake expiry date", async () => {
    const app = await buildApp({ certificateRepository: createFakeCertificateRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-NO-EXPIRY-001",
        certificateName: "未见明确到期日证照",
        certificateType: "honor_cert",
        ownerType: "company",
        ownerPartyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ownerNameSnapshot: "我方公司主体",
        validityType: "no_expiry_visible",
        attachmentPath: "legacy-fixtures/certificates/CERT-NO-EXPIRY-001.pdf",
        sourceFilePath: "legacy-fixtures/certificates/source-pack.pdf",
        sourcePageNo: 2,
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      certificate: {
        certificateCode: "CERT-NO-EXPIRY-001",
        validityType: "no_expiry_visible",
        expiryDate: null,
        attachmentPath: "legacy-fixtures/certificates/CERT-NO-EXPIRY-001.pdf",
        sourceFilePath: "legacy-fixtures/certificates/source-pack.pdf",
        sourcePageNo: 2,
      },
    });
  });

  it("rejects invalid date and owner combinations", async () => {
    const app = await buildApp({ certificateRepository: createFakeCertificateRepository() });

    const fixedWithoutExpiry = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-BAD",
        certificateName: "错误证照",
        certificateType: "business_license",
        ownerType: "company",
        ownerNameSnapshot: "公司主体",
        validityType: "fixed_expiry",
      },
    });
    const multiOwner = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-BAD2",
        certificateName: "多归属错误",
        certificateType: "business_license",
        ownerType: "supplier",
        ownerEmployeeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ownerNameSnapshot: "供应商",
        validityType: "long_term",
        reminderDays: -1,
      },
    });
    const mismatchedOwner = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-BAD3",
        certificateName: "供应商归属错误",
        certificateType: "supplier_qualification",
        ownerType: "supplier",
        ownerEmployeeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ownerNameSnapshot: "供应商",
        validityType: "long_term",
      },
    });
    const missingOwner = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT-BAD4",
        certificateName: "无归属错误",
        certificateType: "business_license",
        ownerType: "company",
        ownerNameSnapshot: "公司主体",
        validityType: "long_term",
      },
    });
    await app.close();

    expect(fixedWithoutExpiry.statusCode).toBe(400);
    expect(fixedWithoutExpiry.json().issues).toContain("expiryDate is required for fixed_expiry certificates");
    expect(multiOwner.statusCode).toBe(400);
    expect(multiOwner.json().issues).toContain("exactly one owner link is allowed when owner link fields are provided");
    expect(multiOwner.json().issues).toContain("reminderDays must be a non-negative integer");
    expect(mismatchedOwner.statusCode).toBe(400);
    expect(mismatchedOwner.json().issues).toContain("supplier and company certificates can only link a party owner");
    expect(missingOwner.statusCode).toBe(400);
    expect(missingOwner.json().issues).toContain("company certificates must link a party owner");
  });

  it("rejects certificate updates that would leave an invalid final owner state", async () => {
    const repository = createFakeCertificateRepository([makeCertificate()]);
    const app = await buildApp({ certificateRepository: repository });

    const clearOnlyOwner = await app.inject({
      method: "PATCH",
      url: `/api/certificates/${certificateId}`,
      payload: { ownerProjectSiteId: null },
    });
    const changeTypeWithoutOwner = await app.inject({
      method: "PATCH",
      url: `/api/certificates/${certificateId}`,
      payload: { ownerType: "supplier" },
    });
    const validOwnerMove = await app.inject({
      method: "PATCH",
      url: `/api/certificates/${certificateId}`,
      payload: {
        ownerType: "supplier",
        ownerProjectSiteId: null,
        ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ownerNameSnapshot: "供应商有限公司",
      },
    });
    await app.close();

    expect(clearOnlyOwner.statusCode).toBe(400);
    expect(clearOnlyOwner.json().issues).toContain("project_site certificates must link a project site owner");
    expect(changeTypeWithoutOwner.statusCode).toBe(400);
    expect(changeTypeWithoutOwner.json().issues).toContain("supplier certificates must link a party owner");
    expect(validOwnerMove.statusCode).toBe(200);
    expect(validOwnerMove.json()).toMatchObject({
      certificate: {
        ownerType: "supplier",
        ownerProjectSiteId: null,
        ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
    });
  });

  it("returns duplicate certificate codes as conflict", async () => {
    const app = await buildApp({ certificateRepository: createFakeCertificateRepository([makeCertificate()]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT0001",
        certificateName: "重复证照",
        certificateType: "business_license",
        ownerType: "company",
        ownerPartyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ownerNameSnapshot: "公司主体",
        validityType: "long_term",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: "CERTIFICATE_CONFLICT", field: "certificateCode" });
  });

  it("scopes certificate visibility by project site and owner type", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const repository = createFakeCertificateRepository([
      makeCertificate({ id: "site-assigned", ownerProjectSiteId: assignedProjectSiteId, ownerNameSnapshot: "已分配项目点" }),
      makeCertificate({ id: "site-unassigned", ownerProjectSiteId: unassignedProjectSiteId, ownerNameSnapshot: "未分配项目点" }),
      makeCertificate({
        id: "roster-health",
        certificateType: "person_health_cert",
        ownerType: "person",
        ownerProjectSiteId: null,
        ownerRosterPersonId: "55555555-5555-4555-8555-555555555555",
        ownerRosterPersonProjectSiteId: assignedProjectSiteId,
        ownerNameSnapshot: "王现场",
      }),
      makeCertificate({ id: "supplier-cert", ownerType: "supplier", ownerProjectSiteId: null, ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", ownerNameSnapshot: "供应商" }),
    ]);
    const authRepository = createFakeAuthRepository([
      makeAuthAccount({ username: "user", passwordHash, roles: ["project_site"], assignedProjectSiteIds: [assignedProjectSiteId] }),
      makeAuthAccount({ id: "88888888-8888-4888-8888-888888888888", username: "buyer", passwordHash, roles: ["procurement"], assignedProjectSiteIds: [] }),
    ]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository,
      certificateRepository: repository,
    });

    const projectSiteCookie = await loginCookie(app, "user");
    const buyerCookie = await loginCookie(app, "buyer");
    const projectSiteList = await app.inject({
      method: "GET",
      url: "/api/certificates",
      cookies: { company_erp_session: projectSiteCookie },
    });
    const hiddenDetail = await app.inject({
      method: "GET",
      url: "/api/certificates/site-unassigned",
      cookies: { company_erp_session: projectSiteCookie },
    });
    const projectSiteCreate = await app.inject({
      method: "POST",
      url: "/api/certificates",
      cookies: { company_erp_session: projectSiteCookie },
      payload: { certificateCode: "CERT0003" },
    });
    const buyerList = await app.inject({
      method: "GET",
      url: "/api/certificates",
      cookies: { company_erp_session: buyerCookie },
    });
    await app.close();

    expect(projectSiteList.json().certificates.map((item: CertificateRecordDto) => item.id)).toEqual([
      "site-assigned",
      "roster-health",
    ]);
    expect(hiddenDetail.statusCode).toBe(404);
    expect(projectSiteCreate.statusCode).toBe(403);
    expect(buyerList.json().certificates.map((item: CertificateRecordDto) => item.id)).toEqual(["supplier-cert"]);
  });

  it("lets external project-site accounts create only assigned-site certificates", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret-external-certificates" },
      authRepository: createFakeAuthRepository([makeExternalProjectSiteAuthAccount({ passwordHash })]),
      certificateRepository: createFakeCertificateRepository(),
      projectSiteComplianceRepository: createFakeComplianceRepository(),
    });
    const cookie = await loginCookie(app, "site-manager");

    const assignedHealth = await app.inject({
      method: "POST",
      url: "/api/certificates",
      cookies: { company_erp_session: cookie },
      payload: {
        certificateCode: "HC-ASSIGNED-001",
        certificateName: "本项目点健康证",
        certificateType: "person_health_cert",
        ownerType: "person",
        ownerRosterPersonId: assignedRosterPersonId,
        ownerNameSnapshot: "王现场",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
      },
    });
    const unassignedHealth = await app.inject({
      method: "POST",
      url: "/api/certificates",
      cookies: { company_erp_session: cookie },
      payload: {
        certificateCode: "HC-UNASSIGNED-001",
        certificateName: "其他项目点健康证",
        certificateType: "person_health_cert",
        ownerType: "person",
        ownerRosterPersonId: unassignedRosterPersonId,
        ownerNameSnapshot: "李现场",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
      },
    });
    const assignedFoodLicense = await app.inject({
      method: "POST",
      url: "/api/certificates",
      cookies: { company_erp_session: cookie },
      payload: {
        certificateCode: "FOOD-ASSIGNED-001",
        certificateName: "本项目点食品经营许可证",
        certificateType: "food_operation_license",
        ownerType: "project_site",
        ownerProjectSiteId: assignedProjectSiteId,
        ownerNameSnapshot: "科技园一期项目点",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
      },
    });
    const unassignedFoodLicense = await app.inject({
      method: "POST",
      url: "/api/certificates",
      cookies: { company_erp_session: cookie },
      payload: {
        certificateCode: "FOOD-UNASSIGNED-001",
        certificateName: "其他项目点食品经营许可证",
        certificateType: "food_operation_license",
        ownerType: "project_site",
        ownerProjectSiteId: unassignedProjectSiteId,
        ownerNameSnapshot: "滨江项目点",
        validityType: "fixed_expiry",
        expiryDate: "2027-05-01",
      },
    });
    const supplierCertificate = await app.inject({
      method: "POST",
      url: "/api/certificates",
      cookies: { company_erp_session: cookie },
      payload: {
        certificateCode: "SUP-FORBIDDEN-001",
        certificateName: "供应商资质",
        certificateType: "supplier_qualification",
        ownerType: "supplier",
        ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ownerNameSnapshot: "供应商",
        validityType: "long_term",
      },
    });
    await app.close();

    expect(assignedHealth.statusCode).toBe(201);
    expect(assignedHealth.json()).toMatchObject({
      certificate: { ownerType: "person", ownerRosterPersonId: assignedRosterPersonId },
    });
    expect(unassignedHealth.statusCode).toBe(404);
    expect(assignedFoodLicense.statusCode).toBe(201);
    expect(assignedFoodLicense.json()).toMatchObject({
      certificate: { ownerType: "project_site", ownerProjectSiteId: assignedProjectSiteId },
    });
    expect(unassignedFoodLicense.statusCode).toBe(404);
    expect(supplierCertificate.statusCode).toBe(403);
  });

  it("keeps certificate scope defensive for project-site roles even if extra roles are present", () => {
    const request = {
      currentUser: {
        roles: ["project_site", "viewer"],
        assignedProjectSiteIds: [assignedProjectSiteId],
      },
    };

    expect(certificateFiltersForRequest(request)).toEqual({
      ownerTypes: ["project_site", "person"],
      projectSiteIds: [assignedProjectSiteId],
    });
    expect(isOutsideCertificateScope(request, makeCertificate({ ownerProjectSiteId: unassignedProjectSiteId }))).toBe(true);
  });
});
