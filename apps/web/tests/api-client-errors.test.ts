import { describe, expect, it } from "vitest";
import { ApiRequestError, formatApiError } from "../src/apiClient";

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
});
