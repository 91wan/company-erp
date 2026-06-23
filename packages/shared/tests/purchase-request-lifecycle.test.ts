import { describe, expect, it } from "vitest";
import {
  allowedPurchaseRequestActions,
  nextPurchaseRequestStatus,
  type PurchaseRequestStatusCode,
} from "../src/index";

describe("purchase request lifecycle contract", () => {
  it("allows only draft requests to be submitted", () => {
    expect(allowedPurchaseRequestActions("draft")).toEqual(["submit"]);
    expect(nextPurchaseRequestStatus("draft", "submit")).toBe("pending_approval");
  });

  it("allows only pending approval requests to be approved or rejected", () => {
    expect(allowedPurchaseRequestActions("pending_approval")).toEqual([
      "approve",
      "reject",
    ]);
    expect(nextPurchaseRequestStatus("pending_approval", "approve")).toBe(
      "pending_purchase",
    );
    expect(nextPurchaseRequestStatus("pending_approval", "reject")).toBe(
      "rejected",
    );
  });

  it("does not allow terminal or downstream states to use approval actions", () => {
    const closedStatuses: PurchaseRequestStatusCode[] = [
      "pending_purchase",
      "purchasing",
      "partially_received",
      "completed",
      "rejected",
      "cancelled",
    ];

    for (const status of closedStatuses) {
      expect(allowedPurchaseRequestActions(status)).toEqual([]);
      expect(nextPurchaseRequestStatus(status, "submit")).toBeNull();
      expect(nextPurchaseRequestStatus(status, "approve")).toBeNull();
      expect(nextPurchaseRequestStatus(status, "reject")).toBeNull();
    }
  });
});
