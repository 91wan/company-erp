import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedTabs, WorkspaceScaffold } from "../src/components/ui";

describe("workspace scaffold and tabs", () => {
  it("renders the standard workspace order", () => {
    render(
      <WorkspaceScaffold
        eyebrow="经营业务"
        title="测试工作区"
        subtitle="一行说明"
        actions={<button type="button">主操作</button>}
        summary={<div>摘要卡片</div>}
        tabs={<div>分区</div>}
      >
        <div>当前内容</div>
      </WorkspaceScaffold>,
    );

    expect(screen.getByRole("heading", { name: "测试工作区" })).toBeInTheDocument();
    expect(screen.getByText("摘要卡片")).toBeInTheDocument();
    expect(screen.getByText("分区")).toBeInTheDocument();
    expect(screen.getByText("当前内容")).toBeInTheDocument();
  });

  it("uses accessible segmented tabs and only changes enabled tabs", () => {
    const onChange = vi.fn();

    render(
      <SegmentedTabs
        ariaLabel="示例分区"
        activeKey="risk"
        onChange={onChange}
        items={[
          { key: "risk", label: "风险" },
          { key: "ledger", label: "台账", badge: 3 },
          { key: "future", label: "后续", disabled: true, disabledReason: "后续开放" },
        ]}
      />,
    );

    expect(screen.getByRole("tablist", { name: "示例分区" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "风险" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "台账 3" }));
    expect(onChange).toHaveBeenCalledWith("ledger");

    fireEvent.click(screen.getByRole("tab", { name: "后续" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
