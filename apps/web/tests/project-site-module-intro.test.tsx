import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectSiteModuleIntro } from "../src/components/project-sites/ProjectSiteModuleIntro";

describe("ProjectSiteModuleIntro", () => {
  it("shows headquarters module scope without pseudo tabs or disabled roadmap buttons", () => {
    render(<ProjectSiteModuleIntro usageOnly={false} canIssueUsage />);

    expect(screen.getByText("项目点事务按风险台账、物料领用、厨房设备和投入合同分区处理。")).toBeInTheDocument();
    expect(screen.getByText("总部视角")).toBeInTheDocument();
    expect(screen.getByText("可执行总部出库")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/月度经营报表|现场库存/)).not.toBeInTheDocument();
  });

  it("shows scoped project-site copy without headquarters-only entries", () => {
    render(<ProjectSiteModuleIntro usageOnly canIssueUsage={false} />);

    expect(screen.getByText("当前账号只处理绑定项目点的物料领用。")).toBeInTheDocument();
    expect(screen.getByText("项目点视角")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/总部出库|月度经营报表|现场库存/)).not.toBeInTheDocument();
  });
});
