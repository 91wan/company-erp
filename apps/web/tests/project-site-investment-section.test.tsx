import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteInvestmentSection } from "../src/components/project-sites/ProjectSiteInvestmentSection";
import { projectSite, projectSiteInvestmentSummary } from "./appTestHelpers";

describe("ProjectSiteInvestmentSection", () => {
  it("renders investment summary rows and keeps the project-site selector controlled", () => {
    const onSelectedSiteChange = vi.fn();

    render(
      <ProjectSiteInvestmentSection
        sites={[projectSite]}
        selectedSiteId={projectSite.id}
        investmentSummary={projectSiteInvestmentSummary}
        investmentSummaryStatus="ready"
        onSelectedSiteChange={onSelectedSiteChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "投入合同" })).toBeInTheDocument();
    expect(screen.getByLabelText("投入合同项目点")).toHaveDisplayValue(`${projectSite.siteCode} ${projectSite.siteName}`);
    expect(screen.getByText("装修/改造")).toBeInTheDocument();
    expect(screen.getByText("设备")).toBeInTheDocument();
    expect(screen.getByText("合计")).toBeInTheDocument();
    expect(screen.getByText("¥260,000.00")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("投入合同项目点"), { target: { value: "" } });
    expect(onSelectedSiteChange).toHaveBeenCalledWith("");
  });
});
