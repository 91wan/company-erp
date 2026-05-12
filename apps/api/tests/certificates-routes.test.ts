import { describe, expect, it } from "vitest";
import type {
  CertificateRecordDto,
  CreateCertificateRecordInput,
  UpdateCertificateRecordInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import { type AuthAccountRecord, type AuthRepository } from "../src/auth";
import {
  CertificateConflictError,
  getCertificateComputedStatus,
  type CertificateListFilters,
  type CertificateRepository,
} from "../src/certificates";
import { hashPassword } from "../src/password";

const now = "2026-05-12T08:00:00.000Z";
const certificateId = "11111111-1111-4111-8111-111111111111";
const assignedProjectSiteId = "22222222-2222-4222-8222-222222222222";
const unassignedProjectSiteId = "33333333-3333-4333-8333-333333333333";

function makeCertificate(overrides: Partial<CertificateRecordDto> = {}): CertificateRecordDto {
  return {
    id: certificateId,
    certificateCode: "CERT0001",
    certificateName: "项目点食品经营许可证",
    certificateType: "food_operation_license",
    ownerType: "project_site",
    ownerEmployeeId: null,
    ownerEmployeeName: null,
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
    attachmentPath: "/volume1/company-erp/attachments/certificates/CERT0001.pdf",
    sourceFilePath: "/volume1/company-erp/attachments/certificates/source-pack.pdf",
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
          ? filters.projectSiteIds.includes(record.ownerProjectSiteId ?? "")
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

async function loginCookie(app: ReturnType<typeof buildApp>, username = "user") {
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
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/api/certificates" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists, reads, creates, and updates certificate records", async () => {
    const repository = createFakeCertificateRepository([makeCertificate()]);
    const app = buildApp({ certificateRepository: repository });

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

  it("rejects invalid date and owner combinations", async () => {
    const app = buildApp({ certificateRepository: createFakeCertificateRepository() });

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
    await app.close();

    expect(fixedWithoutExpiry.statusCode).toBe(400);
    expect(fixedWithoutExpiry.json().issues).toContain("expiryDate is required for fixed_expiry certificates");
    expect(multiOwner.statusCode).toBe(400);
    expect(multiOwner.json().issues).toContain("exactly one owner link is allowed when owner link fields are provided");
    expect(multiOwner.json().issues).toContain("reminderDays must be a non-negative integer");
    expect(mismatchedOwner.statusCode).toBe(400);
    expect(mismatchedOwner.json().issues).toContain("supplier and company certificates can only link a party owner");
  });

  it("returns duplicate certificate codes as conflict", async () => {
    const app = buildApp({ certificateRepository: createFakeCertificateRepository([makeCertificate()]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/certificates",
      payload: {
        certificateCode: "CERT0001",
        certificateName: "重复证照",
        certificateType: "business_license",
        ownerType: "company",
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
      makeCertificate({ id: "supplier-cert", ownerType: "supplier", ownerProjectSiteId: null, ownerPartyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", ownerNameSnapshot: "供应商" }),
    ]);
    const authRepository = createFakeAuthRepository([
      makeAuthAccount({ username: "user", passwordHash, roles: ["project_site"], assignedProjectSiteIds: [assignedProjectSiteId] }),
      makeAuthAccount({ id: "88888888-8888-4888-8888-888888888888", username: "buyer", passwordHash, roles: ["procurement"], assignedProjectSiteIds: [] }),
    ]);
    const app = buildApp({
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

    expect(projectSiteList.json().certificates.map((item: CertificateRecordDto) => item.id)).toEqual(["site-assigned"]);
    expect(hiddenDetail.statusCode).toBe(404);
    expect(projectSiteCreate.statusCode).toBe(403);
    expect(buyerList.json().certificates.map((item: CertificateRecordDto) => item.id)).toEqual(["supplier-cert"]);
  });
});
