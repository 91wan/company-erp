import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AttachmentRecordDto,
  CertificateRecordDto,
  CreateAttachmentRecordInput,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto,
  ProjectSiteEmployerLiabilityInsurancePolicyDto,
  ProjectSitePayrollSubmissionDto,
  ProjectSiteRosterPersonDto,
  UpdateAttachmentRecordInput,
} from "@company-erp/shared";
import { buildApp } from "../src/app";
import type { AttachmentRecordRepository } from "../src/attachments";
import type { AuditLogRepository } from "../src/auditLogs";
import type { AuthAccountRecord, AuthRepository } from "../src/auth";
import type { CertificateListFilters, CertificateRepository } from "../src/certificates";
import { hashPassword } from "../src/password";
import type {
  CreateProjectSiteInsuranceCoveredPersonInput,
  CreateProjectSiteInsurancePolicyInput,
  CreateProjectSitePayrollSubmissionInput,
  CreateProjectSiteRosterPersonInput,
  ProjectSiteComplianceRepository,
  ProjectSiteInsuranceCoveredPersonListFilters,
  ProjectSiteInsurancePolicyListFilters,
  ProjectSiteListFilters,
  ProjectSitePayrollSubmissionListFilters,
  ProjectSiteRepository,
  ProjectSiteRosterPersonListFilters,
} from "../src/projectSites";

const now = "2026-05-14T10:00:00.000Z";

function makeAuthAccount(overrides: Partial<AuthAccountRecord> = {}): AuthAccountRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    username: "admin",
    passwordHash: "scrypt$missing$missing",
    status: "active",
    employeeId: null,
    employeeNo: null,
    employeeName: null,
    employeeStatus: null,
    roles: ["admin"],
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

function makeAttachment(overrides: Partial<AttachmentRecordDto> = {}): AttachmentRecordDto {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    attachmentCode: "ATT-DEMO-001",
    displayName: "DEMO 合同附件",
    storageKey: "contracts/demo-contract.pdf",
    originalFileName: "demo-contract.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
    ownerModule: "contracts",
    ownerEntityType: "contract",
    ownerEntityId: "33333333-3333-4333-8333-333333333333",
    status: "active",
    createdByUserId: "11111111-1111-4111-8111-111111111111",
    createdByUsername: "admin",
    remark: "DEMO metadata only",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const assignedProjectSiteId = "77777777-7777-4777-8777-777777777777";
const otherProjectSiteId = "88888888-8888-4888-8888-888888888888";
const assignedCertificateId = "99999999-9999-4999-8999-999999999999";
const otherCertificateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const assignedPolicyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const assignedPayrollSubmissionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function makeProjectSite(overrides: Partial<ProjectSiteDto> = {}): ProjectSiteDto {
  return {
    id: assignedProjectSiteId,
    siteCode: "SITE-A",
    siteName: "科技园项目点",
    businessProjectId: null,
    businessProjectName: null,
    clientPartyId: null,
    clientPartyName: null,
    operatorPartyId: null,
    operatorPartyName: null,
    serviceMode: "subcontracted",
    subcontractorPartyId: null,
    subcontractorPartyName: null,
    region: "华东",
    siteAddress: "科技园一号楼",
    serviceType: "食堂运营",
    status: "active",
    primaryManagerEmployeeId: null,
    primaryManagerEmployeeName: null,
    clientContactName: "王项目",
    clientContactPhone: "13900000000",
    subcontractorContactName: null,
    subcontractorContactPhone: null,
    startDate: "2026-05-01",
    endDate: null,
    payrollAgencyRequired: true,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCertificate(overrides: Partial<CertificateRecordDto> = {}): CertificateRecordDto {
  return {
    id: assignedCertificateId,
    certificateCode: "CERT-SITE-A",
    certificateName: "科技园项目点食品经营许可证",
    certificateType: "food_operation_license",
    ownerType: "project_site",
    ownerEmployeeId: null,
    ownerEmployeeName: null,
    ownerRosterPersonId: null,
    ownerRosterPersonName: null,
    ownerRosterPersonProjectSiteId: null,
    ownerProjectSiteId: assignedProjectSiteId,
    ownerProjectSiteName: "科技园项目点",
    ownerPartyId: null,
    ownerPartyName: null,
    ownerNameSnapshot: "科技园项目点",
    certificateNumber: "JY13202000000001",
    issuingAuthority: "市场监督管理局",
    certificateScope: "食堂经营",
    issueDate: "2026-05-01",
    validityType: "fixed_expiry",
    expiryDate: "2027-04-30",
    nextReviewDate: null,
    reminderDays: 30,
    computedStatus: "valid",
    isComplianceCritical: true,
    attachmentPath: null,
    sourceFilePath: null,
    sourcePageNo: null,
    responsibleEmployeeId: null,
    responsibleEmployeeName: null,
    confirmedByEmployeeId: null,
    confirmedByEmployeeName: null,
    confirmedAt: null,
    isDisabled: false,
    remark: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeInsurancePolicy(overrides: Partial<ProjectSiteEmployerLiabilityInsurancePolicyDto> = {}): ProjectSiteEmployerLiabilityInsurancePolicyDto {
  return {
    id: assignedPolicyId,
    projectSiteId: assignedProjectSiteId,
    projectSiteName: "科技园项目点",
    policyNo: "ELI202605001",
    insurerName: "太平洋保险",
    startDate: "2026-05-01",
    endDate: "2027-04-30",
    attachmentPath: null,
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

function makePayrollSubmission(overrides: Partial<ProjectSitePayrollSubmissionDto> = {}): ProjectSitePayrollSubmissionDto {
  return {
    id: assignedPayrollSubmissionId,
    projectSiteId: assignedProjectSiteId,
    projectSiteName: "科技园项目点",
    payrollMonth: "2026-05",
    attachmentPath: "unified-attachment-pending",
    submittedBy: "王项目",
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

function createFakeAttachmentRepository(seed: AttachmentRecordDto[] = [makeAttachment()]): AttachmentRecordRepository {
  const attachments = [...seed];
  return {
    async list(filters) {
      return attachments.filter((attachment) => {
        if (filters.ownerModule && attachment.ownerModule !== filters.ownerModule) return false;
        if (filters.ownerEntityType && attachment.ownerEntityType !== filters.ownerEntityType) return false;
        if (filters.ownerEntityId && attachment.ownerEntityId !== filters.ownerEntityId) return false;
        if (filters.status && attachment.status !== filters.status) return false;
        if (filters.q && !`${attachment.attachmentCode} ${attachment.displayName} ${attachment.storageKey}`.includes(filters.q)) {
          return false;
        }
        return true;
      });
    },
    async getById(id) {
      return attachments.find((attachment) => attachment.id === id) ?? null;
    },
    async create(input: CreateAttachmentRecordInput) {
      if (attachments.some((attachment) => attachment.attachmentCode === input.attachmentCode)) {
        throw new Error("ATTACHMENT_CONFLICT");
      }
      const attachment = makeAttachment({
        id: "44444444-4444-4444-8444-444444444444",
        attachmentCode: input.attachmentCode,
        displayName: input.displayName,
        storageKey: input.storageKey,
        originalFileName: input.originalFileName ?? null,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        ownerModule: input.ownerModule,
        ownerEntityType: input.ownerEntityType,
        ownerEntityId: input.ownerEntityId ?? null,
        status: input.status ?? "active",
        createdByUserId: input.createdByUserId ?? null,
        createdByUsername: input.createdByUsername ?? null,
        remark: input.remark ?? null,
      });
      attachments.push(attachment);
      return attachment;
    },
    async update(id, input: UpdateAttachmentRecordInput) {
      const index = attachments.findIndex((attachment) => attachment.id === id);
      if (index === -1) return null;
      attachments[index] = { ...attachments[index], ...input, updatedAt: now };
      return attachments[index];
    },
  };
}

function createFakeProjectSiteRepository(seed: ProjectSiteDto[] = [makeProjectSite()]): ProjectSiteRepository {
  const projectSites = [...seed];
  return {
    async list(filters: ProjectSiteListFilters) {
      return projectSites.filter((site) => {
        const matchesScope = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(site.id) : true;
        return matchesScope;
      });
    },
    async getById(id) {
      return projectSites.find((site) => site.id === id) ?? null;
    },
    async getInvestmentSummary() {
      return null;
    },
    async create() {
      throw new Error("not used");
    },
    async update() {
      return null;
    },
  };
}

function createFakeCertificateRepository(seed: CertificateRecordDto[] = [makeCertificate()]): CertificateRepository {
  const certificates = [...seed];
  return {
    async list(filters: CertificateListFilters) {
      return certificates.filter((certificate) => {
        const matchesScope = filters.projectSiteIds
          ? filters.projectSiteIds.includes(certificate.ownerProjectSiteId ?? "") ||
            filters.projectSiteIds.includes(certificate.ownerRosterPersonProjectSiteId ?? "")
          : true;
        return matchesScope;
      });
    },
    async getById(id) {
      return certificates.find((certificate) => certificate.id === id) ?? null;
    },
    async create() {
      throw new Error("not used");
    },
    async update() {
      return null;
    },
  };
}

function createFakeComplianceRepository(): ProjectSiteComplianceRepository {
  const policies = [
    makeInsurancePolicy(),
    makeInsurancePolicy({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      projectSiteId: otherProjectSiteId,
      projectSiteName: "其他项目点",
      policyNo: "ELI-OTHER",
    }),
  ];
  const payrollSubmissions = [
    makePayrollSubmission(),
    makePayrollSubmission({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      projectSiteId: otherProjectSiteId,
      projectSiteName: "其他项目点",
      payrollMonth: "2026-05",
    }),
  ];

  return {
    async listRosterPeople(_filters: ProjectSiteRosterPersonListFilters): Promise<ProjectSiteRosterPersonDto[]> {
      return [];
    },
    async createRosterPerson(_input: CreateProjectSiteRosterPersonInput): Promise<ProjectSiteRosterPersonDto> {
      throw new Error("not used");
    },
    async listInsurancePolicies(filters: ProjectSiteInsurancePolicyListFilters): Promise<ProjectSiteEmployerLiabilityInsurancePolicyDto[]> {
      return policies.filter((policy) => {
        const matchesSite = filters.projectSiteId ? policy.projectSiteId === filters.projectSiteId : true;
        const matchesScope = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(policy.projectSiteId) : true;
        return matchesSite && matchesScope;
      });
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
    async listPayrollSubmissions(filters: ProjectSitePayrollSubmissionListFilters): Promise<ProjectSitePayrollSubmissionDto[]> {
      return payrollSubmissions.filter((submission) => {
        const matchesSite = filters.projectSiteId ? submission.projectSiteId === filters.projectSiteId : true;
        const matchesScope = filters.projectSiteIds?.length ? filters.projectSiteIds.includes(submission.projectSiteId) : true;
        const matchesMonth = filters.payrollMonth ? submission.payrollMonth === filters.payrollMonth : true;
        return matchesSite && matchesScope && matchesMonth;
      });
    },
    async createPayrollSubmission(_input: CreateProjectSitePayrollSubmissionInput): Promise<ProjectSitePayrollSubmissionDto> {
      throw new Error("not used");
    },
    async getComplianceSummary(_projectSiteId: string): Promise<ProjectSiteComplianceSummaryDto | null> {
      return null;
    },
  };
}

function createFakeAuditLogRepository(): AuditLogRepository {
  const logs: Awaited<ReturnType<AuditLogRepository["list"]>> = [];
  return {
    async list(filters) {
      return logs.filter((log) => !filters.action || log.action === filters.action);
    },
    async create(input) {
      const log = {
        id: `99999999-9999-4999-8999-${String(logs.length + 1).padStart(12, "0")}`,
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

function multipartPayload(fields: Record<string, string | undefined>, file?: { name?: string; type?: string; content?: Buffer | string }) {
  const boundary = "----company-erp-attachment-test-boundary";
  const chunks: Buffer[] = [];
  function push(value: string | Buffer) {
    chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
  }

  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
    push(`${value}\r\n`);
  }
  if (file) {
    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="file"; filename="${file.name ?? "attachment.pdf"}"\r\n`);
    push(`Content-Type: ${file.type ?? "application/pdf"}\r\n\r\n`);
    push(Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content ?? "demo attachment"));
    push("\r\n");
  }
  push(`--${boundary}--\r\n`);
  return {
    payload: Buffer.concat(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

async function loginCookie(app: Awaited<ReturnType<typeof buildApp>>, username = "admin") {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: "ChangeMe123!" },
  });
  return response.cookies.find((cookie) => cookie.name === "company_erp_session")?.value ?? "";
}

describe("attachments API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires attachment permissions for list/detail/create/update", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "55555555-5555-4555-8555-555555555555",
          username: "procurement",
          passwordHash,
          roles: ["procurement"],
        }),
        makeAuthAccount({
          id: "66666666-6666-4666-8666-666666666666",
          username: "viewer",
          passwordHash,
          roles: ["viewer"],
        }),
      ]),
      attachmentRepository: createFakeAttachmentRepository(),
      auditLogRepository: createFakeAuditLogRepository(),
    });

    const anonymous = await app.inject({ method: "GET", url: "/api/attachments" });
    const adminCookie = await loginCookie(app, "admin");
    const procurementCookie = await loginCookie(app, "procurement");
    const viewerCookie = await loginCookie(app, "viewer");
    const list = await app.inject({
      method: "GET",
      url: "/api/attachments?ownerModule=contracts&q=DEMO",
      cookies: { company_erp_session: procurementCookie },
    });
    const forbiddenRead = await app.inject({
      method: "GET",
      url: "/api/attachments",
      cookies: { company_erp_session: viewerCookie },
    });
    const forbiddenWrite = await app.inject({
      method: "POST",
      url: "/api/attachments",
      cookies: { company_erp_session: procurementCookie },
      payload: {
        attachmentCode: "ATT-DEMO-002",
        displayName: "DEMO 证照附件",
        storageKey: "certificates/demo-certificate.jpg",
        ownerModule: "certificates",
        ownerEntityType: "certificate",
      },
    });
    const detail = await app.inject({
      method: "GET",
      url: "/api/attachments/22222222-2222-4222-8222-222222222222",
      cookies: { company_erp_session: adminCookie },
    });
    await app.close();

    expect(anonymous.statusCode).toBe(401);
    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual({ attachments: [expect.objectContaining({ attachmentCode: "ATT-DEMO-001" })] });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toEqual({ attachment: expect.objectContaining({ storageKey: "contracts/demo-contract.pdf" }) });
    expect(forbiddenRead.statusCode).toBe(403);
    expect(forbiddenWrite.statusCode).toBe(403);
    expect(forbiddenWrite.json()).toMatchObject({ permissionArea: "attachments", requiredLevel: "manage" });
  });

  it("creates and updates attachment metadata with audit logs", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      attachmentRepository: createFakeAttachmentRepository([]),
      auditLogRepository,
    });

    const cookie = await loginCookie(app);
    const created = await app.inject({
      method: "POST",
      url: "/api/attachments",
      cookies: { company_erp_session: cookie },
      payload: {
        attachmentCode: "ATT-DEMO-002",
        displayName: "DEMO 证照附件",
        storageKey: "certificates/demo-certificate.jpg",
        originalFileName: "demo-certificate.jpg",
        fileType: "image/jpeg",
        fileSize: 2048,
        ownerModule: "certificates",
        ownerEntityType: "certificate",
        ownerEntityId: "77777777-7777-4777-8777-777777777777",
        remark: "metadata only",
      },
    });
    const id = created.json().attachment.id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/attachments/${id}`,
      cookies: { company_erp_session: cookie },
      payload: { displayName: "DEMO 证照附件 v2", status: "disabled" },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(created.statusCode).toBe(201);
    expect(created.json()).toEqual({
      attachment: expect.objectContaining({
        attachmentCode: "ATT-DEMO-002",
        storageKey: "certificates/demo-certificate.jpg",
        createdByUserId: "11111111-1111-4111-8111-111111111111",
        createdByUsername: "admin",
      }),
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toEqual({ attachment: expect.objectContaining({ displayName: "DEMO 证照附件 v2", status: "disabled" }) });
    expect(logs.map((log) => log.action)).toEqual(["attachment.create", "attachment.update"]);
    expect(JSON.stringify(logs)).not.toContain("secret");
  });

  it("uploads an attachment file with a backend-generated storage key and audit log", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-upload-"));
    vi.stubEnv("NAS_ATTACHMENTS_ROOT", root);
    const passwordHash = await hashPassword("ChangeMe123!");
    const auditLogRepository = createFakeAuditLogRepository();
    const attachmentRepository = createFakeAttachmentRepository([]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      attachmentRepository,
      auditLogRepository,
    });

    try {
      const cookie = await loginCookie(app);
      const uploaded = await app.inject({
        method: "POST",
        url: "/api/attachments/upload",
        cookies: { company_erp_session: cookie },
        ...multipartPayload(
          {
            ownerModule: "contracts",
            ownerEntityType: "contract",
            ownerEntityId: "33333333-3333-4333-8333-333333333333",
            displayName: "合同盖章扫描件",
            remark: "总部登记上传",
          },
          { name: "signed-contract.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });
      const body = uploaded.json();
      const storedPath = join(root, body.attachment.storageKey);
      const storedContent = await readFile(storedPath, "utf8");
      const logs = await auditLogRepository.list({});

      expect(uploaded.statusCode).toBe(201);
      expect(body).toEqual({
        attachment: expect.objectContaining({
          attachmentCode: expect.stringMatching(/^ATT-\d{8}-[A-F0-9]{8}$/),
          displayName: "合同盖章扫描件",
          storageKey: expect.stringMatching(/^contracts\/[0-9a-f-]+\.pdf$/),
          originalFileName: "signed-contract.pdf",
          fileType: "application/pdf",
          fileSize: Buffer.byteLength("PDF demo content"),
          ownerModule: "contracts",
          ownerEntityType: "contract",
          ownerEntityId: "33333333-3333-4333-8333-333333333333",
          createdByUsername: "admin",
        }),
      });
      expect(storedContent).toBe("PDF demo content");
      expect(logs.map((log) => log.action)).toContain("attachment.upload");
      expect(JSON.stringify(logs)).not.toContain(root);
      expect(JSON.stringify(logs)).not.toContain("PDF demo content");
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects arbitrary upload storage keys and external project-site upload attempts", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-upload-"));
    vi.stubEnv("NAS_ATTACHMENTS_ROOT", root);
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: ["77777777-7777-4777-8777-777777777777"],
        }),
      ]),
      attachmentRepository: createFakeAttachmentRepository([]),
      auditLogRepository: createFakeAuditLogRepository(),
    });

    try {
      const adminCookie = await loginCookie(app, "admin");
      const externalCookie = await loginCookie(app, "external-site");
      const unsafeStorageKey = await app.inject({
        method: "POST",
        url: "/api/attachments/upload",
        cookies: { company_erp_session: adminCookie },
        ...multipartPayload(
          {
            ownerModule: "contracts",
            ownerEntityType: "contract",
            storageKey: "contracts/user-supplied.pdf",
          },
          { name: "signed-contract.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });
      const externalUpload = await app.inject({
        method: "POST",
        url: "/api/attachments/upload",
        cookies: { company_erp_session: externalCookie },
        ...multipartPayload(
          {
            ownerModule: "project_sites",
            ownerEntityType: "project_site",
            ownerEntityId: "77777777-7777-4777-8777-777777777777",
            displayName: "外部项目点附件",
          },
          { name: "site-license.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });
      await app.close();

      expect(unsafeStorageKey.statusCode).toBe(400);
      expect(unsafeStorageKey.json()).toMatchObject({
        error: "ATTACHMENT_VALIDATION_FAILED",
        issues: expect.arrayContaining(["storageKey cannot be supplied for upload"]),
      });
      expect(externalUpload.statusCode).toBe(403);
      expect(externalUpload.json()).toMatchObject({ permissionArea: "attachments", requiredLevel: "manage" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows external project-site accounts to upload attachments only through scoped business targets", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-business-upload-"));
    vi.stubEnv("NAS_ATTACHMENTS_ROOT", root);
    const passwordHash = await hashPassword("ChangeMe123!");
    const auditLogRepository = createFakeAuditLogRepository();
    const attachmentRepository = createFakeAttachmentRepository([]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: [assignedProjectSiteId],
        }),
      ]),
      attachmentRepository,
      auditLogRepository,
      certificateRepository: createFakeCertificateRepository([
        makeCertificate(),
        makeCertificate({ id: otherCertificateId, ownerProjectSiteId: otherProjectSiteId, ownerProjectSiteName: "其他项目点" }),
      ]),
      projectSiteRepository: createFakeProjectSiteRepository([
        makeProjectSite(),
        makeProjectSite({ id: otherProjectSiteId, siteCode: "SITE-B", siteName: "其他项目点" }),
      ]),
      projectSiteComplianceRepository: createFakeComplianceRepository(),
    });

    try {
      const externalCookie = await loginCookie(app, "external-site");
      const uploaded = await app.inject({
        method: "POST",
        url: "/api/project-site-attachment-uploads",
        cookies: { company_erp_session: externalCookie },
        ...multipartPayload(
          {
            targetType: "certificate_record",
            targetId: assignedCertificateId,
            displayName: "食品经营许可证附件",
            remark: "外部项目点提交",
          },
          { name: "food-license.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });
      const body = uploaded.json();
      const [createdAttachment] = await attachmentRepository.list({});
      const storedContent = await readFile(join(root, createdAttachment.storageKey), "utf8");
      const logs = await auditLogRepository.list({});

      expect(uploaded.statusCode).toBe(201);
      expect(body).toEqual({
        attachment: expect.objectContaining({
          attachmentCode: expect.stringMatching(/^ATT-\d{8}-[A-F0-9]{8}$/),
          displayName: "食品经营许可证附件",
          storageKey: "",
          originalFileName: "food-license.pdf",
          fileType: "application/pdf",
          fileSize: Buffer.byteLength("PDF demo content"),
          ownerModule: "certificates",
          ownerEntityType: "certificate",
          ownerEntityId: assignedCertificateId,
          createdByUsername: "external-site",
        }),
      });
      expect(createdAttachment.storageKey).toMatch(/^certificates\/[0-9a-f-]+\.pdf$/);
      expect(JSON.stringify(body)).not.toContain(createdAttachment.storageKey);
      expect(storedContent).toBe("PDF demo content");
      expect(logs.map((log) => log.action)).toContain("attachment.business_upload");
      expect(JSON.stringify(logs)).not.toContain(root);
      expect(JSON.stringify(logs)).not.toContain("PDF demo content");
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("derives project-site business attachment owners for policy, payroll, and site-level targets", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-business-upload-"));
    vi.stubEnv("NAS_ATTACHMENTS_ROOT", root);
    const passwordHash = await hashPassword("ChangeMe123!");
    const attachmentRepository = createFakeAttachmentRepository([]);
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: [assignedProjectSiteId],
        }),
      ]),
      attachmentRepository,
      auditLogRepository: createFakeAuditLogRepository(),
      certificateRepository: createFakeCertificateRepository(),
      projectSiteRepository: createFakeProjectSiteRepository(),
      projectSiteComplianceRepository: createFakeComplianceRepository(),
    });

    try {
      const externalCookie = await loginCookie(app, "external-site");
      for (const target of [
        { targetType: "employer_liability_policy", targetId: assignedPolicyId },
        { targetType: "payroll_submission", targetId: assignedPayrollSubmissionId },
        { targetType: "project_site_food_license", targetId: assignedProjectSiteId },
      ]) {
        const response = await app.inject({
          method: "POST",
          url: "/api/project-site-attachment-uploads",
          cookies: { company_erp_session: externalCookie },
          ...multipartPayload(
            {
              ...target,
              displayName: `${target.targetType} 附件`,
            },
            { name: `${target.targetType}.pdf`, type: "application/pdf", content: "PDF demo content" },
          ),
        });

        expect(response.statusCode).toBe(201);
        expect(response.json().attachment.storageKey).toBe("");
      }

      const attachments = await attachmentRepository.list({});
      expect(attachments).toEqual([
        expect.objectContaining({
          ownerModule: "project-sites",
          ownerEntityType: "employer_liability_insurance_policy",
          ownerEntityId: assignedPolicyId,
        }),
        expect.objectContaining({
          ownerModule: "project-sites",
          ownerEntityType: "payroll_submission",
          ownerEntityId: assignedPayrollSubmissionId,
        }),
        expect.objectContaining({
          ownerModule: "project-sites",
          ownerEntityType: "project_site",
          ownerEntityId: assignedProjectSiteId,
        }),
      ]);
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects cross-project business attachment uploads and caller-supplied owner fields", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-business-upload-"));
    vi.stubEnv("NAS_ATTACHMENTS_ROOT", root);
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: [assignedProjectSiteId],
        }),
      ]),
      attachmentRepository: createFakeAttachmentRepository([]),
      auditLogRepository: createFakeAuditLogRepository(),
      certificateRepository: createFakeCertificateRepository([
        makeCertificate(),
        makeCertificate({ id: otherCertificateId, ownerProjectSiteId: otherProjectSiteId, ownerProjectSiteName: "其他项目点" }),
      ]),
      projectSiteRepository: createFakeProjectSiteRepository([
        makeProjectSite(),
        makeProjectSite({ id: otherProjectSiteId, siteCode: "SITE-B", siteName: "其他项目点" }),
      ]),
      projectSiteComplianceRepository: createFakeComplianceRepository(),
    });

    try {
      const externalCookie = await loginCookie(app, "external-site");
      const crossProjectCertificate = await app.inject({
        method: "POST",
        url: "/api/project-site-attachment-uploads",
        cookies: { company_erp_session: externalCookie },
        ...multipartPayload(
          {
            targetType: "certificate_record",
            targetId: otherCertificateId,
            displayName: "其他项目点证照",
          },
          { name: "other-license.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });
      const callerOwner = await app.inject({
        method: "POST",
        url: "/api/project-site-attachment-uploads",
        cookies: { company_erp_session: externalCookie },
        ...multipartPayload(
          {
            targetType: "payroll_submission",
            targetId: assignedPayrollSubmissionId,
            ownerModule: "project-sites",
            ownerEntityType: "project_site",
            ownerEntityId: otherProjectSiteId,
            storageKey: "project-sites/user-supplied.pdf",
          },
          { name: "payroll.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });
      const invalidTarget = await app.inject({
        method: "POST",
        url: "/api/project-site-attachment-uploads",
        cookies: { company_erp_session: externalCookie },
        ...multipartPayload(
          {
            targetType: "supplier_certificate",
            targetId: assignedCertificateId,
          },
          { name: "supplier.pdf", type: "application/pdf", content: "PDF demo content" },
        ),
      });

      expect(crossProjectCertificate.statusCode).toBe(404);
      expect(crossProjectCertificate.json()).toEqual({ error: "ATTACHMENT_UPLOAD_TARGET_NOT_FOUND" });
      expect(callerOwner.statusCode).toBe(400);
      expect(callerOwner.json()).toMatchObject({
        error: "ATTACHMENT_VALIDATION_FAILED",
        issues: expect.arrayContaining(["owner and storageKey fields cannot be supplied for business uploads"]),
      });
      expect(invalidTarget.statusCode).toBe(400);
      expect(invalidTarget.json()).toMatchObject({
        error: "ATTACHMENT_VALIDATION_FAILED",
        issues: expect.arrayContaining(["targetType is unsupported"]),
      });
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unsafe storage keys", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] })]),
      attachmentRepository: createFakeAttachmentRepository([]),
      auditLogRepository: createFakeAuditLogRepository(),
    });
    const cookie = await loginCookie(app);

    for (const storageKey of ["", "/tmp/demo.pdf", "https://example.com/demo.pdf", "../demo.pdf", "contracts\\demo.pdf", "contracts/demo\u0000.pdf"]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/attachments",
        cookies: { company_erp_session: cookie },
        payload: {
          attachmentCode: `ATT-${storageKey.length}`,
          displayName: "DEMO 附件",
          storageKey,
          ownerModule: "contracts",
          ownerEntityType: "contract",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "ATTACHMENT_VALIDATION_FAILED" });
    }

    await app.close();
  });

  it("returns repository missing and not found errors", async () => {
    const appWithoutRepository = await buildApp({ auth: { enabled: false } });
    const missingRepository = await appWithoutRepository.inject({ method: "GET", url: "/api/attachments" });
    await appWithoutRepository.close();

    const app = await buildApp({
      auth: { enabled: false },
      attachmentRepository: createFakeAttachmentRepository([]),
    });
    const notFound = await app.inject({ method: "GET", url: "/api/attachments/22222222-2222-4222-8222-222222222222" });
    await app.close();

    expect(missingRepository.statusCode).toBe(503);
    expect(missingRepository.json()).toEqual({ error: "ATTACHMENT_REPOSITORY_NOT_CONFIGURED" });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.json()).toEqual({ error: "ATTACHMENT_NOT_FOUND" });
  });

  it("returns scoped download references without exposing absolute storage paths", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const siteId = "77777777-7777-4777-8777-777777777777";
    const otherSiteId = "88888888-8888-4888-8888-888888888888";
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: [siteId],
        }),
      ]),
      attachmentRepository: createFakeAttachmentRepository([
        makeAttachment({
          id: "22222222-2222-4222-8222-222222222222",
          attachmentCode: "ATT-SITE-001",
          storageKey: "project-sites/site-license.pdf",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: siteId,
        }),
        makeAttachment({
          id: "33333333-3333-4333-8333-333333333333",
          attachmentCode: "ATT-SITE-OTHER",
          storageKey: "project-sites/other-license.pdf",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: otherSiteId,
        }),
      ]),
      auditLogRepository,
    });

    const adminCookie = await loginCookie(app, "admin");
    const externalCookie = await loginCookie(app, "external-site");
    const adminDownload = await app.inject({
      method: "GET",
      url: "/api/attachments/22222222-2222-4222-8222-222222222222/download-url",
      cookies: { company_erp_session: adminCookie },
    });
    const scopedDownload = await app.inject({
      method: "GET",
      url: "/api/attachments/22222222-2222-4222-8222-222222222222/download-url",
      cookies: { company_erp_session: externalCookie },
    });
    const outOfScope = await app.inject({
      method: "GET",
      url: "/api/attachments/33333333-3333-4333-8333-333333333333/download-url",
      cookies: { company_erp_session: externalCookie },
    });
    const logs = await auditLogRepository.list({});
    await app.close();

    expect(adminDownload.statusCode).toBe(200);
    expect(scopedDownload.statusCode).toBe(200);
    expect(scopedDownload.json()).toEqual({
      attachmentDownload: {
        attachmentId: "22222222-2222-4222-8222-222222222222",
        storageKey: "",
        downloadRef: "/api/attachments/22222222-2222-4222-8222-222222222222/content",
      },
    });
    expect(JSON.stringify(scopedDownload.json())).not.toContain("project-sites/site-license.pdf");
    expect(JSON.stringify(scopedDownload.json())).not.toContain("/volume1");
    expect(outOfScope.statusCode).toBe(404);
    expect(outOfScope.json()).toEqual({ error: "ATTACHMENT_NOT_FOUND" });
    expect(logs.map((log) => log.action)).toEqual(["attachment.download_url", "attachment.download_url"]);
    expect(JSON.stringify(logs)).not.toContain("project-sites/site-license.pdf");
    expect(JSON.stringify(logs)).not.toContain("/volume1");
  });

  it("scopes attachment metadata list and detail for external project-site accounts", async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const siteId = "77777777-7777-4777-8777-777777777777";
    const otherSiteId = "88888888-8888-4888-8888-888888888888";
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: [siteId],
        }),
      ]),
      attachmentRepository: createFakeAttachmentRepository([
        makeAttachment({
          id: "22222222-2222-4222-8222-222222222222",
          attachmentCode: "ATT-SITE-001",
          storageKey: "project-sites/site-license.pdf",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: siteId,
        }),
        makeAttachment({
          id: "33333333-3333-4333-8333-333333333333",
          attachmentCode: "ATT-SITE-OTHER",
          storageKey: "project-sites/other-license.pdf",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: otherSiteId,
        }),
      ]),
    });

    const externalCookie = await loginCookie(app, "external-site");
    const list = await app.inject({
      method: "GET",
      url: "/api/attachments",
      cookies: { company_erp_session: externalCookie },
    });
    const ownerFilteredOutOfScopeList = await app.inject({
      method: "GET",
      url: `/api/attachments?ownerModule=project_sites&ownerEntityType=project_site&ownerEntityId=${otherSiteId}`,
      cookies: { company_erp_session: externalCookie },
    });
    const assignedDetail = await app.inject({
      method: "GET",
      url: "/api/attachments/22222222-2222-4222-8222-222222222222",
      cookies: { company_erp_session: externalCookie },
    });
    const outOfScopeDetail = await app.inject({
      method: "GET",
      url: "/api/attachments/33333333-3333-4333-8333-333333333333",
      cookies: { company_erp_session: externalCookie },
    });
    const arbitraryCreate = await app.inject({
      method: "POST",
      url: "/api/attachments",
      cookies: { company_erp_session: externalCookie },
      payload: {
        attachmentCode: "ATT-SITE-NEW",
        displayName: "外部项目点任意附件",
        storageKey: "project-sites/site-new.pdf",
        ownerModule: "project_sites",
        ownerEntityType: "project_site",
        ownerEntityId: siteId,
      },
    });
    await app.close();

    expect(list.statusCode).toBe(200);
    expect(list.json()).toEqual({
      attachments: [expect.objectContaining({ attachmentCode: "ATT-SITE-001", storageKey: "" })],
    });
    expect(JSON.stringify(list.json())).not.toContain("project-sites/site-license.pdf");
    expect(ownerFilteredOutOfScopeList.statusCode).toBe(200);
    expect(ownerFilteredOutOfScopeList.json()).toEqual({ attachments: [] });
    expect(assignedDetail.statusCode).toBe(200);
    expect(assignedDetail.json()).toEqual({
      attachment: expect.objectContaining({ attachmentCode: "ATT-SITE-001", storageKey: "" }),
    });
    expect(JSON.stringify(assignedDetail.json())).not.toContain("project-sites/site-license.pdf");
    expect(outOfScopeDetail.statusCode).toBe(404);
    expect(outOfScopeDetail.json()).toEqual({ error: "ATTACHMENT_NOT_FOUND" });
    expect(arbitraryCreate.statusCode).toBe(403);
    expect(arbitraryCreate.json()).toMatchObject({ permissionArea: "attachments", requiredLevel: "manage" });
  });

  it("serves scoped attachment content from safe storage keys without exposing root paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "company-erp-attachments-"));
    await mkdir(join(root, "project-sites"), { recursive: true });
    await writeFile(join(root, "project-sites", "site-license.txt"), "DEMO attachment content");
    vi.stubEnv("NAS_ATTACHMENTS_ROOT", root);

    const passwordHash = await hashPassword("ChangeMe123!");
    const siteId = "77777777-7777-4777-8777-777777777777";
    const otherSiteId = "88888888-8888-4888-8888-888888888888";
    const auditLogRepository = createFakeAuditLogRepository();
    const app = await buildApp({
      auth: { enabled: true, sessionSecret: "test-secret" },
      authRepository: createFakeAuthRepository([
        makeAuthAccount({ username: "admin", passwordHash, roles: ["admin"] }),
        makeAuthAccount({
          id: "77777777-7777-4777-8777-000000000001",
          username: "external-site",
          passwordHash,
          roles: ["external_project_site"],
          assignedProjectSiteIds: [siteId],
        }),
      ]),
      attachmentRepository: createFakeAttachmentRepository([
        makeAttachment({
          id: "22222222-2222-4222-8222-222222222222",
          attachmentCode: "ATT-SITE-001",
          storageKey: "project-sites/site-license.txt",
          originalFileName: "site-license.txt",
          fileType: "text/plain",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: siteId,
        }),
        makeAttachment({
          id: "33333333-3333-4333-8333-333333333333",
          attachmentCode: "ATT-SITE-OTHER",
          storageKey: "project-sites/other-license.txt",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: otherSiteId,
        }),
        makeAttachment({
          id: "44444444-4444-4444-8444-444444444444",
          attachmentCode: "ATT-SITE-MISSING",
          storageKey: "project-sites/missing-file.txt",
          ownerModule: "project_sites",
          ownerEntityType: "project_site",
          ownerEntityId: siteId,
        }),
      ]),
      auditLogRepository,
    });

    try {
      const adminCookie = await loginCookie(app, "admin");
      const externalCookie = await loginCookie(app, "external-site");
      const adminContent = await app.inject({
        method: "GET",
        url: "/api/attachments/22222222-2222-4222-8222-222222222222/content",
        cookies: { company_erp_session: adminCookie },
      });
      const scopedContent = await app.inject({
        method: "GET",
        url: "/api/attachments/22222222-2222-4222-8222-222222222222/content",
        cookies: { company_erp_session: externalCookie },
      });
      const outOfScope = await app.inject({
        method: "GET",
        url: "/api/attachments/33333333-3333-4333-8333-333333333333/content",
        cookies: { company_erp_session: externalCookie },
      });
      const missingContent = await app.inject({
        method: "GET",
        url: "/api/attachments/44444444-4444-4444-8444-444444444444/content",
        cookies: { company_erp_session: externalCookie },
      });
      const logs = await auditLogRepository.list({});

      expect(adminContent.statusCode).toBe(200);
      expect(adminContent.payload).toBe("DEMO attachment content");
      expect(adminContent.headers["content-type"]).toContain("text/plain");
      expect(adminContent.headers["content-disposition"]).toBe('attachment; filename="site-license.txt"');
      expect(adminContent.headers["x-content-type-options"]).toBe("nosniff");
      expect(scopedContent.statusCode).toBe(200);
      expect(scopedContent.payload).toBe("DEMO attachment content");
      expect(scopedContent.headers["content-disposition"]).toBe('attachment; filename="site-license.txt"');
      expect(scopedContent.headers["x-content-type-options"]).toBe("nosniff");
      expect(JSON.stringify(scopedContent.headers)).not.toContain(root);
      expect(outOfScope.statusCode).toBe(404);
      expect(outOfScope.json()).toEqual({ error: "ATTACHMENT_NOT_FOUND" });
      expect(missingContent.statusCode).toBe(404);
      expect(missingContent.json()).toEqual({ error: "ATTACHMENT_CONTENT_NOT_FOUND" });
      expect(logs.map((log) => log.action)).toEqual(["attachment.content_read", "attachment.content_read"]);
      expect(JSON.stringify(logs)).not.toContain(root);
      expect(JSON.stringify(logs)).not.toContain("project-sites/site-license.txt");
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
