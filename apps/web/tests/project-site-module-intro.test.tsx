import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectSiteModuleIntro } from "../src/components/project-sites/ProjectSiteModuleIntro";

describe("ProjectSiteModuleIntro", () => {
  it("shows headquarters module scope and enabled tabs", () => {
    render(<ProjectSiteModuleIntro usageOnly={false} canIssueUsage />);

    expect(screen.getByText("当前库存余额 -> 项目点领用申请 -> 总部仓库出库 -> 库存流水扣减")).toBeInTheDocument();
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
