import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectSiteRiskLedgerSection } from "../src/components/project-sites/ProjectSiteRiskLedgerSection";
import { businessProject, party, projectSite, projectSiteComplianceSummary } from "./appTestHelpers";
import { createInitialSiteForm } from "../src/components/project-sites/projectSiteFormState";

describe("ProjectSiteRiskLedgerSection", () => {
  it("renders the risk ledger and opens details from a row action", () => {
    const onSelectSite = vi.fn();

    render(
      <ProjectSiteRiskLedgerSection
        filteredSites={[projectSite]}
        siteStatus="ready"
        complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
        openFormDrawer={null}
        canEditSites
        siteForm={createInitialSiteForm()}
        clientParties={[party]}
        operatorParties={[party]}
        subcontractorParties={[party]}
        businessProjects={[businessProject]}
        masterStatus="ready"
        siteSubmitState="idle"
        siteSubmitError=""
        onSelectSite={onSelectSite}
        onSiteFormChange={vi.fn()}
        onCloseForm={vi.fn()}
        onCreateSite={vi.fn()}
      />,
    );

    expect(screen.getByText("项目点风险台账")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    expect(onSelectSite).toHaveBeenCalledWith(projectSite);
  });

  it("shows the project-site create drawer when requested", () => {
    render(
      <ProjectSiteRiskLedgerSection
        filteredSites={[projectSite]}
        siteStatus="ready"
        complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
        openFormDrawer="site"
        canEditSites
        siteForm={createInitialSiteForm()}
        clientParties={[party]}
        operatorParties={[party]}
        subcontractorParties={[party]}
        businessProjects={[businessProject]}
        masterStatus="ready"
        siteSubmitState="idle"
        siteSubmitError=""
        onSelectSite={vi.fn()}
        onSiteFormChange={vi.fn()}
        onCloseForm={vi.fn()}
        onCreateSite={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "新增项目点" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存项目点" })).toBeInTheDocument();
  });
});
