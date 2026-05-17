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

    fireEvent.change(screen.getByLabelText("公司名称"), { target: { value: "无锡餐服 ERP" } });
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(await screen.findByText("系统设置已保存。")).toBeInTheDocument();
    expect(onCompanyNameChange).toHaveBeenCalledWith({ companyName: "无锡餐服 ERP" });
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

    expect(await screen.findByText("certificate.create")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("审计对象类型"), { target: { value: "certificate" } });
    fireEvent.change(screen.getByLabelText("审计动作"), { target: { value: "certificate.create" } });
    fireEvent.change(screen.getByLabelText("审计开始日期"), { target: { value: "2026-05-14" } });
    fireEvent.change(screen.getByLabelText("审计结束日期"), { target: { value: "2026-05-15" } });

    await waitFor(() => {
      const auditUrls = fetchSpy.mock.calls.map(([input]) => String(input)).filter((url) => url.includes("/api/audit-logs"));
      expect(auditUrls.some((url) => {
        const parsed = new URL(url);
        return parsed.searchParams.get("entityType") === "certificate"
          && parsed.searchParams.get("action") === "certificate.create"
          && parsed.searchParams.get("dateFrom") === "2026-05-14T00:00:00.000Z"
          && parsed.searchParams.get("dateTo") === "2026-05-15T23:59:59.999Z";
      })).toBe(true);
    });
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

    expect(await screen.findByText("contracts/demo-contract.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下载/打开 DEMO 合同附件" }));

    const error = await screen.findByText("附件内容不可用，请检查权限或文件是否已登记到服务器。");
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

    expect(screen.queryByRole("button", { name: "保存设置" })).not.toBeInTheDocument();
    expect(screen.getByText("当前账号没有 systemSettings.manage 权限，不能修改公司名称。")).toBeInTheDocument();
    expect(screen.getByLabelText("公司名称")).toBeDisabled();
    expect(await screen.findByText("当前账号只能查看附件元数据，不能登记或修改附件引用。")).toBeInTheDocument();
  });
});
