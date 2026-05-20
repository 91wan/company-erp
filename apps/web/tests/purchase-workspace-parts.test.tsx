import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PURCHASE_REQUEST_STATUSES } from "@company-erp/shared";
import {
  PurchaseFilterToolbar,
  PurchaseRecordsTable,
  PurchaseRequestsTable,
} from "../src/components/purchase/PurchaseWorkspaceParts";
import { purchaseRecord, purchaseRequest } from "./appTestHelpers";

describe("purchase workspace presentation parts", () => {
  it("keeps purchase filtering in the shared toolbar", () => {
    const onQueryChange = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <PurchaseFilterToolbar
        query=""
        onQueryChange={onQueryChange}
        filter="all"
        onFilterChange={onFilterChange}
        options={PURCHASE_REQUEST_STATUSES}
        searchLabel="搜索采购需求"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("搜索采购需求"), { target: { value: "工服" } });
    fireEvent.change(screen.getByRole("combobox", { name: "搜索采购需求" }), { target: { value: "draft" } });

    expect(onQueryChange).toHaveBeenCalledWith("工服");
    expect(onFilterChange).toHaveBeenCalledWith("draft");
  });

  it("renders request and record tables without owning workspace state", () => {
    const onSubmitRequest = vi.fn();
    const onSelectRequest = vi.fn();
    const onSelectRecord = vi.fn();

    render(
      <>
        <PurchaseRequestsTable
          requests={[purchaseRequest]}
          canManage
          reviewState="idle"
          onSubmitRequest={onSubmitRequest}
          onSelectRequest={onSelectRequest}
        />
        <PurchaseRecordsTable records={[purchaseRecord]} onSelectRecord={onSelectRecord} />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: `提交 ${purchaseRequest.requestNo}` }));
    expect(onSubmitRequest).toHaveBeenCalledWith(purchaseRequest);
    expect(onSelectRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(purchaseRecord.purchaseNo));
    expect(onSelectRecord).toHaveBeenCalledWith(purchaseRecord);
  });
});
