import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { projectUsageRequest } from "./appTestHelpers";
import {
  ProjectUsageIssueFormDrawer,
  type ProjectUsageIssueFormState,
} from "../src/components/project-sites/ProjectUsageIssueFormDrawer";

function createForm(overrides: Partial<ProjectUsageIssueFormState> = {}): ProjectUsageIssueFormState {
  return {
    requestId: "",
    outboundNo: "",
    movementDate: "",
    quantity: "",
    handledBy: "",
    receivedByName: "",
    ...overrides,
  };
}

describe("ProjectUsageIssueFormDrawer", () => {
  it("requires an inline confirmation before submitting an outbound issue", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onCancelConfirm = vi.fn();

    const { rerender } = render(
      <ProjectUsageIssueFormDrawer
        open
        canIssueUsage
        form={createForm({ requestId: projectUsageRequest.id })}
        usageRequests={[projectUsageRequest]}
        pendingIssueConfirm={false}
        submitState="idle"
        submitError=""
        onChange={onChange}
        onCancelConfirm={onCancelConfirm}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("出库单号"), { target: { value: "OUT20260517001" } });
    fireEvent.click(screen.getByRole("button", { name: "执行出库" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outboundNo: "OUT20260517001" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("确认执行本次出库？")).not.toBeInTheDocument();

    rerender(
      <ProjectUsageIssueFormDrawer
        open
        canIssueUsage
        form={createForm({ requestId: projectUsageRequest.id })}
        usageRequests={[projectUsageRequest]}
        pendingIssueConfirm
        submitState="idle"
        submitError=""
        onChange={onChange}
        onCancelConfirm={onCancelConfirm}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("确认执行本次出库？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancelConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "确认出库" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("does not render the issue form when the user cannot issue usage", () => {
    render(
      <ProjectUsageIssueFormDrawer
        open
        canIssueUsage={false}
        form={createForm()}
        usageRequests={[projectUsageRequest]}
        pendingIssueConfirm={false}
        submitState="idle"
        submitError=""
        onChange={vi.fn()}
        onCancelConfirm={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("form", { name: "出库登记表单" })).not.toBeInTheDocument();
  });
});
