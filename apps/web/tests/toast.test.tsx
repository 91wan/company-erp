import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastTone } from "../src/components/ui";

function Emitter({ message, tone }: { message: string; tone?: ToastTone }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.notify(message, tone)}>
      emit
    </button>
  );
}

describe("ToastProvider / useToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a toast on notify and stacks multiple", () => {
    render(
      <ToastProvider>
        <Emitter message="已保存" tone="success" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "emit" }));
    fireEvent.click(screen.getByRole("button", { name: "emit" }));

    expect(screen.getAllByText("已保存")).toHaveLength(2);
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("uses role=alert for error tone", () => {
    render(
      <ToastProvider>
        <Emitter message="保存失败" tone="error" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "emit" }));
    expect(screen.getByRole("alert")).toHaveTextContent("保存失败");
  });

  it("auto-dismisses after the tone duration", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Emitter message="已保存" tone="success" />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "emit" }));
    });
    expect(screen.getByText("已保存")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("已保存")).not.toBeInTheDocument();
  });

  it("dismisses manually via the close button", () => {
    render(
      <ToastProvider>
        <Emitter message="已保存" tone="success" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "emit" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭通知" }));
    expect(screen.queryByText("已保存")).not.toBeInTheDocument();
  });

  it("degrades to a no-op when no provider is mounted", () => {
    render(<Emitter message="无 Provider" tone="success" />);
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "emit" })),
    ).not.toThrow();
    expect(screen.queryByText("无 Provider")).not.toBeInTheDocument();
  });
});
