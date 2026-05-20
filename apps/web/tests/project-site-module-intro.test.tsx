import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectSiteModuleIntro } from "../src/components/project-sites/ProjectSiteModuleIntro";

describe("ProjectSiteModuleIntro", () => {
  it("shows headquarters module scope and enabled tabs", () => {
    render(<ProjectSiteModuleIntro usageOnly={false} canIssueUsage />);

    expect(screen.getByText("项目点事务按风险台账、物料领用、厨房设备和投入合同分区处理。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目点台账" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "总部出库" })).not.toBeDisabled();
    expect(screen.getByText(/月度经营报表、现场库存尚未开放/)).toBeInTheDocument();
  });

  it("shows scoped project-site module tabs without headquarters-only entries", () => {
    render(<ProjectSiteModuleIntro usageOnly canIssueUsage={false} />);

    expect(screen.queryByRole("button", { name: "项目点台账" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "总部出库" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "领用申请" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText(/月度经营报表、现场库存尚未开放/)).not.toBeInTheDocument();
  });
});
