import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmAction } from "../src/components/ui";

describe("ConfirmAction", () => {
  it("requires a second confirmation before running the action", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmAction
        actionLabel="停用账号"
        confirmationText="确认停用 admin？"
        confirmLabel="确认停用"
        cancelLabel="取消"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "停用账号" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("确认停用 admin？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确认停用 admin？")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "停用账号" }));
    fireEvent.click(screen.getByRole("button", { name: "确认停用" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("supports controlled confirmation state", () => {
    const onRequestConfirm = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <ConfirmAction
        actionLabel="审批通过"
        confirmationText="确认审批通过 PR-001？"
        confirmLabel="确认审批通过"
        confirming={false}
        onRequestConfirm={onRequestConfirm}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "审批通过" }));
    expect(onRequestConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("确认审批通过 PR-001？")).not.toBeInTheDocument();

    rerender(
      <ConfirmAction
        actionLabel="审批通过"
        confirmationText="确认审批通过 PR-001？"
        confirmLabel="确认审批通过"
        confirming
        onRequestConfirm={onRequestConfirm}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "确认审批通过" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables repeated clicks while pending and shows action errors", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmAction
        actionLabel="确认危险操作"
        confirmationText="确认执行危险操作？"
        confirmLabel="确认执行"
        cancelLabel="取消"
        danger
        pending
        error="操作失败，请重试"
        onConfirm={onConfirm}
      />,
    );

    const actionButton = screen.getByRole("button", { name: "确认危险操作" });
    expect(actionButton).toBeDisabled();
    expect(screen.getByText("操作失败，请重试")).toBeInTheDocument();
  });
});
