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
});
