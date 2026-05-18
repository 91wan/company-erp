import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSiteComplianceDetailsPanel } from "../src/components/project-sites/ProjectSiteComplianceDetailsPanel";
import {
  certificate,
  jsonResponse,
  projectSite,
  rosterPerson,
} from "./appTestHelpers";

const insurancePolicy = {
  id: "79797979-7979-4979-8979-797979797979",
  projectSiteId: projectSite.id,
  projectSiteName: projectSite.siteName,
  policyNo: "ELI-2026-001",
  insurerName: "太平洋保险",
  startDate: "2026-05-01",
  endDate: "2027-04-30",
  attachmentPath: null,
  reviewStatus: "approved",
  reviewedByEmployeeId: null,
  reviewedByEmployeeName: null,
  reviewedAt: null,
  remark: null,
  createdAt: "2026-05-12T08:00:00.000Z",
  updatedAt: "2026-05-12T08:00:00.000Z",
};

const payrollSubmission = {
  id: "78787878-7878-4878-8878-787878787878",
  projectSiteId: projectSite.id,
  projectSiteName: projectSite.siteName,
  payrollMonth: "2026-05",
  attachmentPath: "legacy/payroll.xlsx",
  submittedBy: "王项目",
  submittedAt: "2026-05-13T08:00:00.000Z",
  reviewStatus: "pending",
  reviewedByEmployeeId: null,
  reviewedByEmployeeName: null,
  reviewedAt: null,
  remark: null,
  createdAt: "2026-05-13T08:00:00.000Z",
  updatedAt: "2026-05-13T08:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

function mockComplianceDetailFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/api/project-site-roster-persons")) {
      expect(url).toContain(`projectSiteId=${projectSite.id}`);
      return Promise.resolve(jsonResponse({ rosterPeople: [rosterPerson] }));
    }
    if (url.includes("/api/employer-liability-insurance-policies")) {
      expect(url).toContain(`projectSiteId=${projectSite.id}`);
      return Promise.resolve(jsonResponse({ insurancePolicies: [insurancePolicy] }));
    }
    if (url.includes("/api/project-site-payroll-submissions")) {
      expect(url).toContain(`projectSiteId=${projectSite.id}`);
      return Promise.resolve(jsonResponse({ payrollSubmissions: [payrollSubmission] }));
    }
    if (url.includes("/api/certificates")) {
      return Promise.resolve(jsonResponse({ certificates: [certificate] }));
    }
    return Promise.resolve(jsonResponse({}));
  });
}

describe("ProjectSiteComplianceDetailsPanel", () => {
  it("loads real compliance detail lists for a selected project site", async () => {
    const fetchMock = mockComplianceDetailFetch();

    render(<ProjectSiteComplianceDetailsPanel siteId={projectSite.id} section="all" />);

    expect(await screen.findByText(rosterPerson.personName)).toBeInTheDocument();
    expect(screen.getByText(certificate.certificateName)).toBeInTheDocument();
    expect(screen.getByText(insurancePolicy.policyNo)).toBeInTheDocument();
    expect(screen.getByText(payrollSubmission.payrollMonth)).toBeInTheDocument();
    expect(screen.queryByText(/明细维护后续开放/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/project-site-roster-persons"),
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });

  it("keeps unsupported covered-person details explicit without pretending they are editable", async () => {
    mockComplianceDetailFetch();

    render(<ProjectSiteComplianceDetailsPanel siteId={projectSite.id} section="insurance" />);

    expect(await screen.findByText(insurancePolicy.policyNo)).toBeInTheDocument();
    expect(screen.getByText(/被保人员明细后续开放/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /新增被保人员/ })).not.toBeInTheDocument();
  });
});
