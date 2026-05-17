import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { businessProject, party } from "./appTestHelpers";
import {
  ProjectSiteCreateFormDrawer,
  type ProjectSiteCreateFormState,
} from "../src/components/project-sites/ProjectSiteCreateFormDrawer";

function createForm(overrides: Partial<ProjectSiteCreateFormState> = {}): ProjectSiteCreateFormState {
  return {
    siteCode: "",
    siteName: "",
    clientPartyId: "",
    operatorPartyId: "",
    serviceMode: "direct",
    subcontractorPartyId: "",
    region: "",
    siteAddress: "",
    serviceType: "",
    businessProjectId: "",
    primaryManagerEmployeeId: "",
    clientContactName: "",
    clientContactPhone: "",
    remark: "",
    ...overrides,
  };
}

describe("ProjectSiteCreateFormDrawer", () => {
  it("renders the project-site create form and submits through the provided handler", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <ProjectSiteCreateFormDrawer
        open
        canEditSites
        form={createForm({ serviceMode: "subcontracted" })}
        clientParties={[party]}
        operatorParties={[party]}
        subcontractorParties={[party]}
        businessProjects={[businessProject]}
        masterStatus="ready"
        submitState="idle"
        submitError=""
        onChange={onChange}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("项目点编码"), { target: { value: "SITE-WX-002" } });
    fireEvent.change(screen.getByLabelText("业务项目"), { target: { value: businessProject.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存项目点" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ siteCode: "SITE-WX-002" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ businessProjectId: businessProject.id }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not render the form for scoped project-site users without site management permission", () => {
    render(
      <ProjectSiteCreateFormDrawer
        open
        canEditSites={false}
        form={createForm()}
        clientParties={[]}
        operatorParties={[]}
        subcontractorParties={[]}
        businessProjects={[]}
        masterStatus="ready"
        submitState="idle"
        submitError=""
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("form", { name: "新增项目点表单" })).not.toBeInTheDocument();
  });
});
