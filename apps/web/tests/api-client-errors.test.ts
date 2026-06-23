import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, formatApiError, getAttachmentDownloadUrl } from "../src/apiClient";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API error display", () => {
  it("translates backend validation issues before showing them to users", () => {
    const message = formatApiError(
      new ApiRequestError(400, "INVENTORY_VALIDATION_FAILED", [
        "movementNo is required",
        "movementDate must be YYYY-MM-DD",
        "quantity must be a positive number",
        "quantity must be an integer",
      ]),
      "保存失败",
    );

    expect(message).toBe("流水单号必填；入库日期必须为年-月-日格式（YYYY-MM-DD）；数量必须为正数；数量必须为整数");
  });

  it("translates certificate validation issues into Chinese", () => {
    const message = formatApiError(
      new ApiRequestError(400, "CERTIFICATE_VALIDATION_FAILED", [
        "certificateType is unsupported",
        "expiryDate is required for fixed_expiry certificates",
        "person certificates must link exactly one person owner",
      ]),
      "保存失败",
    );

    expect(message).toBe("证照类型不支持；固定到期证照必须填写到期日期；人员证照必须绑定一个人员归属");
  });

  it("reads attachment download URLs from the shared url contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        attachmentDownload: {
          id: "attachment-1",
          url: "/api/attachments/attachment-1/content",
          expiresAt: null,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getAttachmentDownloadUrl("attachment-1")).resolves.toBe("/api/attachments/attachment-1/content");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/attachments/attachment-1/download-url",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
