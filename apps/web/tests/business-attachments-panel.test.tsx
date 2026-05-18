import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessAttachmentsPanel } from "../src/components/BusinessAttachmentsPanel";

describe("BusinessAttachmentsPanel", () => {
  it("keeps business attachment references read-only even for managers", async () => {
    render(
      <BusinessAttachmentsPanel
        ownerModule="contracts"
        ownerEntityType="contract"
        ownerEntityId="contract-1"
        canManage
        loadAttachments={() => Promise.resolve([])}
        getAttachmentDownloadUrl={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("暂无统一附件。")).toBeInTheDocument());
    expect(screen.getByText(/新增或修改附件元数据请在系统设置的附件管理中登记/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Storage Key")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记统一附件" })).not.toBeInTheDocument();
  });

  it("redacts unsafe legacy attachment paths in business pages", async () => {
    render(
      <BusinessAttachmentsPanel
        ownerModule="project-sites"
        ownerEntityType="project_site"
        ownerEntityId="site-1"
        legacyPaths={[
          { label: "旧附件路径", value: "/attachments/private.pdf" },
          { label: "旧来源链接", value: "https://files.example.com/private.pdf" },
          { label: "旧相对引用", value: "contracts/legacy.pdf" },
        ]}
        loadAttachments={() => Promise.resolve([])}
        getAttachmentDownloadUrl={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("暂无统一附件。")).toBeInTheDocument());
    expect(screen.getAllByText("已隐藏服务器路径，仅保留历史兼容字段记录。")).toHaveLength(2);
    expect(screen.getByText("contracts/legacy.pdf")).toBeInTheDocument();
    expect(screen.queryByText("/attachments/private.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText(/files\.example/)).not.toBeInTheDocument();
  });
});
