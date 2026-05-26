import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SystemSettingsWorkspace } from "../src/components/system/SystemSettingsWorkspace";
import {
  adminUser,
  attachmentRecord,
  defaultAppVersion,
  mockShellFetch,
  viewerUser,
} from "./appTestHelpers";

describe("SystemSettingsWorkspace", () => {
  it("saves the company name through the existing app config API", async () => {
    const onCompanyNameChange = vi.fn();
    mockShellFetch(adminUser, { companyName: "Company ERP" });

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={false}
        canReadAttachments={false}
        canManageAttachments={false}
        onCompanyNameChange={onCompanyNameChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("公司名称"), {
      target: { value: "无锡餐服 ERP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(await screen.findByText("系统设置已保存。")).toBeInTheDocument();
    expect(onCompanyNameChange).toHaveBeenCalledWith({
      companyName: "无锡餐服 ERP",
    });
  });

  it("shows a clear deployment version failure state", async () => {
    mockShellFetch(adminUser, undefined, "error");

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={false}
        canReadAttachments={false}
        canManageAttachments={false}
        onCompanyNameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "版本与健康检查" }));
    expect(await screen.findByText("版本信息不可用")).toBeInTheDocument();
  });

  it("keeps audit log filters wired to the existing audit API", async () => {
    const fetchSpy = mockShellFetch(adminUser, undefined, defaultAppVersion, {
      auditLogs: [
        {
          id: "99999999-9999-4999-8999-999999999999",
          actorUserId: adminUser.id,
          actorUsername: "admin",
          action: "certificate.create",
          entityType: "certificate",
          entityId: "88888888-8888-4888-8888-888888888888",
          beforeJson: null,
          afterJson: { certificateCode: "CERT-DEMO-001" },
          ip: "127.0.0.1",
          userAgent: "vitest",
          createdAt: "2026-05-14T10:00:00.000Z",
        },
      ],
    });

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={true}
        canReadAttachments={false}
        canManageAttachments={false}
        onCompanyNameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "审计日志" }));
    expect(await screen.findByText("certificate.create")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("审计对象类型"), {
      target: { value: "certificate" },
    });
    fireEvent.change(screen.getByLabelText("审计动作"), {
      target: { value: "certificate.create" },
    });
    fireEvent.change(screen.getByLabelText("审计开始日期"), {
      target: { value: "2026-05-14" },
    });
    fireEvent.change(screen.getByLabelText("审计结束日期"), {
      target: { value: "2026-05-15" },
    });

    await waitFor(() => {
      const auditUrls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/audit-logs"));
      expect(
        auditUrls.some((url) => {
          const parsed = new URL(url);
          return (
            parsed.searchParams.get("entityType") === "certificate" &&
            parsed.searchParams.get("action") === "certificate.create" &&
            parsed.searchParams.get("dateFrom") ===
              "2026-05-14T00:00:00.000Z" &&
            parsed.searchParams.get("dateTo") === "2026-05-15T23:59:59.999Z"
          );
        }),
      ).toBe(true);
    });
  });

  it("exports audit logs with the current audit filters", async () => {
    const fetchSpy = mockShellFetch(adminUser, undefined, defaultAppVersion, { auditLogs: [] });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:audit-export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={true}
        canReadAttachments={false}
        canManageAttachments={false}
        onCompanyNameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "审计日志" }));
    await screen.findByText("暂无审计日志。");
    expect(
      screen.getByText(/下载后记录 SHA256、筛选条件、导出人和部署版本/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("审计对象类型"), {
      target: { value: "certificate" },
    });
    fireEvent.change(screen.getByLabelText("审计动作"), {
      target: { value: "certificate.create" },
    });
    fireEvent.change(screen.getByLabelText("操作账号"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("审计开始日期"), {
      target: { value: "2026-05-14" },
    });
    fireEvent.change(screen.getByLabelText("审计结束日期"), {
      target: { value: "2026-05-15" },
    });

    fireEvent.click(screen.getByRole("button", { name: "导出 CSV" }));

    expect(await screen.findByText("audit-export-sha256-demo")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText(/npm run audit:verify-export -- --csv audit-export.csv --sha256 audit-export-sha256-demo --record-count 2/),
    ).toBeInTheDocument();
    expect(anchorClick).toHaveBeenCalledTimes(1);

    const exportUrls = fetchSpy.mock.calls
      .map(([input]) => String(input))
      .filter((url) => url.includes("/api/audit-logs/export.csv"));
    expect(exportUrls).toHaveLength(1);
    const parsed = new URL(exportUrls[0]);
    expect(parsed.pathname).toBe("/api/audit-logs/export.csv");
    expect(parsed.searchParams.get("entityType")).toBe("certificate");
    expect(parsed.searchParams.get("action")).toBe("certificate.create");
    expect(parsed.searchParams.get("actorUsername")).toBe("admin");
    expect(parsed.searchParams.get("dateFrom")).toBe(
      "2026-05-14T00:00:00.000Z",
    );
    expect(parsed.searchParams.get("dateTo")).toBe("2026-05-15T23:59:59.999Z");
  });

  it("shows a clear audit export failure state", async () => {
    mockShellFetch(adminUser, undefined, defaultAppVersion, {
      auditLogs: [],
      failures: ["/api/audit-logs/export.csv"],
    });

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={true}
        canReadAttachments={false}
        canManageAttachments={false}
        onCompanyNameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "审计日志" }));
    await screen.findByText("暂无审计日志。");
    fireEvent.click(screen.getByRole("button", { name: "导出 CSV" }));

    expect(
      await screen.findByText("审计 CSV 导出失败，请检查权限或稍后重试。"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("审计导出校验信息")).not.toBeInTheDocument();
  });

  it("shows an attachment download error without exposing a server path", async () => {
    mockShellFetch(adminUser, undefined, defaultAppVersion, {
      attachments: [attachmentRecord],
      attachmentDownloadFailures: [attachmentRecord.id],
    });

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={false}
        canReadAttachments={true}
        canManageAttachments={true}
        onCompanyNameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "附件管理" }));
    expect(
      await screen.findByText("contracts/demo-contract.pdf"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "下载/打开 DEMO 合同附件" }),
    );

    const error = await screen.findByText(
      "附件内容不可用，请检查权限或文件是否已登记到服务器。",
    );
    expect(error).toBeInTheDocument();
    expect(error).not.toHaveTextContent("/volume1");
  });

  it("keeps viewer sessions read-only in system settings", async () => {
    mockShellFetch(viewerUser);

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={false}
        canReadAuditLogs={false}
        canReadAttachments={true}
        canManageAttachments={false}
        onCompanyNameChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "保存设置" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "当前账号没有 systemSettings.manage 权限，不能修改公司名称。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("公司名称")).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "附件管理" }));
    expect(
      await screen.findByText(
        "当前账号只能查看附件元数据，不能登记或修改附件引用。",
      ),
    ).toBeInTheDocument();
  });

  it("shows the production go-live evidence panel only to system managers", async () => {
    mockShellFetch(adminUser, undefined, defaultAppVersion);

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={true}
        canReadAuditLogs={true}
        canReadAttachments={true}
        canManageAttachments={true}
        onCompanyNameChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "正式上线证据" }));

    expect(await screen.findByText("正式上线证据")).toBeInTheDocument();
    expect(screen.getAllByText(/production:go-live-check/).length).toBeGreaterThan(0);
    expect(screen.getByText(/production:evidence-template/)).toBeInTheDocument();
    expect(screen.getByText(/production:ready/)).toBeInTheDocument();
    expect(screen.getByText(/production:health-check/)).toBeInTheDocument();
    expect(screen.getByText(/production:restore-drill-check/)).toBeInTheDocument();
    expect(screen.getByText(/attachments:production-check/)).toBeInTheDocument();
    expect(screen.getByText(/access:review-check/)).toBeInTheDocument();
    expect(screen.getByText(/audit:verify-export/)).toBeInTheDocument();
    expect(screen.getAllByText(/证据目录必须在 Git 仓库外/).length).toBeGreaterThan(0);
    expect(screen.getByText(/不保存 \.env、数据库 dump 原文、附件原件、合同扫描件、健康证图片、工资表到 Git/)).toBeInTheDocument();
    expect(
      screen.getByText("docs/operations/production-go-live-evidence-checklist.md"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/POSTGRES_PASSWORD/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTH_SESSION_SECRET/)).not.toBeInTheDocument();
    expect(screen.queryByText(/IDENTITY_ENCRYPTION_SECRET/)).not.toBeInTheDocument();
  });

  it("hides the production go-live evidence panel from read-only viewers", async () => {
    mockShellFetch(viewerUser);

    render(
      <SystemSettingsWorkspace
        companyName="Company ERP"
        canManage={false}
        canReadAuditLogs={false}
        canReadAttachments={true}
        canManageAttachments={false}
        onCompanyNameChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tab", { name: "正式上线证据" })).not.toBeInTheDocument();
    expect(screen.queryByText(/production:go-live-check/)).not.toBeInTheDocument();
  });
});
