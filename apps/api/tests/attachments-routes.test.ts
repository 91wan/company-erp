import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttachmentRecordDto, CreateAttachmentRecordInput, UpdateAttachmentRecordInput } from "@company-erp/shared";
import { buildApp } from "../src/app";
import type { AttachmentRecordRepository } from "../src/attachments";
import type { AuditLogRepository } from "../src/auditLogs";
import type { AuthAccountRecord, AuthRepository } from "../src/auth";
import { hashPassword } from "../src/password";

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

      expect(adminContent.statusCode).toBe(200);
      expect(adminContent.payload).toBe("DEMO attachment content");
      expect(scopedContent.statusCode).toBe(200);
      expect(scopedContent.payload).toBe("DEMO attachment content");
      expect(JSON.stringify(scopedContent.headers)).not.toContain(root);
      expect(outOfScope.statusCode).toBe(404);
      expect(outOfScope.json()).toEqual({ error: "ATTACHMENT_NOT_FOUND" });
      expect(missingContent.statusCode).toBe(404);
      expect(missingContent.json()).toEqual({ error: "ATTACHMENT_CONTENT_NOT_FOUND" });
    } finally {
      await app.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
