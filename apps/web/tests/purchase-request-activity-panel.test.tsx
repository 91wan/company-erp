import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PurchaseRequestDetailDrawer } from "../src/components/purchase/PurchaseRequestDetailDrawer";
import { jsonResponse, purchaseRequest } from "./appTestHelpers";

describe("purchase request activity timeline", () => {
  it("loads audit logs only when the activity tab is opened", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      auditLogs: [
        {
          id: "audit-1",
          actorUserId: "user-1",
          actorUsername: "procurement-admin",
          action: "purchase_request.submit",
          entityType: "purchase_request",
          entityId: purchaseRequest.id,
          beforeJson: { status: "draft" },
          afterJson: { status: "pending_approval" },
          ip: "127.0.0.1",
          userAgent: "vitest",
          createdAt: "2026-05-13T08:30:00.000Z",
        },
      ],
    }));

    render(
      <PurchaseRequestDetailDrawer
        request={purchaseRequest}
        canReadAuditLogs
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("需求编号")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "操作记录" }));

    await screen.findByText("提交采购需求");
    expect(screen.getByText("procurement-admin")).toBeInTheDocument();
    expect(screen.queryByText("beforeJson")).not.toBeInTheDocument();
    expect(screen.queryByText("afterJson")).not.toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/audit-logs");
    expect(requestedUrl.searchParams.get("entityType")).toBe("purchase_request");
    expect(requestedUrl.searchParams.get("entityId")).toBe(purchaseRequest.id);
  });

  it("hides activity tab when audit log read permission is unavailable", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ auditLogs: [] }));

    render(
      <PurchaseRequestDetailDrawer
        request={purchaseRequest}
        canReadAuditLogs={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tab", { name: "操作记录" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
