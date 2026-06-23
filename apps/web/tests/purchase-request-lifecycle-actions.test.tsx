import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PurchaseRequestDto } from "@company-erp/shared";
import { PurchaseRequestsTable } from "../src/components/purchase/PurchaseWorkspaceParts";
import { PurchaseTodoTab } from "../src/components/purchase/PurchaseTodoTab";
import { purchaseRequest } from "./appTestHelpers";

function requestWithStatus(
  status: PurchaseRequestDto["status"],
): PurchaseRequestDto {
  return {
    ...purchaseRequest,
    id: `request-${status}`,
    requestNo: `PR-${status}`,
    status,
    submittedAt:
      status === "pending_approval" ? "2026-05-11T12:00:00.000Z" : null,
  };
}

describe("purchase request lifecycle actions", () => {
  it("shows submit only for draft requests", () => {
    render(
      <PurchaseRequestsTable
        requests={[
          requestWithStatus("draft"),
          requestWithStatus("pending_approval"),
          requestWithStatus("pending_purchase"),
          requestWithStatus("rejected"),
        ]}
        canManage
        reviewState="idle"
        onSubmitRequest={vi.fn()}
        onSelectRequest={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "提交 PR-draft" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交 PR-pending_approval" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交 PR-pending_purchase" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交 PR-rejected" })).not.toBeInTheDocument();
  });

  it("shows approve and reject only for pending approval requests", () => {
    render(
      <PurchaseTodoTab
        canManage
        pendingApprovalRequests={[requestWithStatus("pending_approval")]}
        pendingReviewAction={null}
        reviewError=""
        reviewRemark=""
        reviewState="idle"
        onReview={vi.fn()}
        onReviewRemarkChange={vi.fn()}
        onPendingReviewActionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /审批通过 PR-pending_approval/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /驳回 PR-pending_approval/ })).toBeInTheDocument();
  });
});
