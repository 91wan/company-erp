import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessAttachmentsPanel } from "../src/components/BusinessAttachmentsPanel";

describe("BusinessAttachmentsPanel", () => {
  it("lets headquarters managers upload unified attachments without exposing storage keys", async () => {
    const uploadedAttachment = {
      id: "attachment-1",
      attachmentCode: "ATT-20260519-ABCDEF01",
      displayName: "合同盖章扫描件",
      originalFileName: "signed-contract.pdf",
      fileType: "application/pdf",
      fileSize: 12,
      ownerModule: "contracts",
      ownerEntityType: "contract",
      ownerEntityId: "contract-1",
      status: "active" as const,
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    };
    const loadAttachments = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([uploadedAttachment]);
    const uploadAttachment = vi.fn().mockResolvedValue(uploadedAttachment);

    render(
      <BusinessAttachmentsPanel
        ownerModule="contracts"
        ownerEntityType="contract"
        ownerEntityId="contract-1"
        canManage
        loadAttachments={loadAttachments}
        getAttachmentDownloadUrl={vi.fn()}
        uploadAttachment={uploadAttachment}
      />,
    );

    await waitFor(() => expect(screen.getByText("暂无统一附件。")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("选择附件文件"), {
      target: { files: [new File(["signed"], "signed-contract.pdf", { type: "application/pdf" })] },
    });
    fireEvent.change(screen.getByLabelText("附件显示名称"), { target: { value: "合同盖章扫描件" } });
    fireEvent.click(screen.getByRole("button", { name: "上传统一附件" }));

    await waitFor(() => expect(uploadAttachment).toHaveBeenCalled());
    expect(uploadAttachment).toHaveBeenCalledWith({
      file: expect.any(File),
      ownerModule: "contracts",
      ownerEntityType: "contract",
      ownerEntityId: "contract-1",
      displayName: "合同盖章扫描件",
      remark: "",
    });
    await waitFor(() => expect(screen.getByText("ATT-20260519-ABCDEF01")).toBeInTheDocument());
    expect(screen.queryByLabelText("Storage Key")).not.toBeInTheDocument();
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
