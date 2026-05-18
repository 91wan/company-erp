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
    if (url.includes("/api/employer-liability-insurance-covered-persons")) {
      expect(url).toContain(`projectSiteId=${projectSite.id}`);
      return Promise.resolve(jsonResponse({
        coveredPersons: [
          {
            id: "77777777-7777-4777-8777-777777777777",
            policyId: insurancePolicy.id,
            rosterPersonId: rosterPerson.id,
            rosterPersonName: rosterPerson.personName,
            coveredNameSnapshot: rosterPerson.personName,
            identityNoLast4Snapshot: rosterPerson.identityNoLast4,
            remark: "已覆盖",
            createdAt: "2026-05-13T08:00:00.000Z",
            updatedAt: "2026-05-13T08:00:00.000Z",
          },
        ],
      }));
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

    await screen.findByText(certificate.certificateName);
    expect(screen.getAllByText(rosterPerson.personName).length).toBeGreaterThan(0);
    expect(screen.getByText(certificate.certificateName)).toBeInTheDocument();
    expect(screen.getAllByText(insurancePolicy.policyNo).length).toBeGreaterThan(0);
    expect(screen.getByText(payrollSubmission.payrollMonth)).toBeInTheDocument();
    expect(screen.queryByText(/明细维护后续开放/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/project-site-roster-persons"),
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });

  it("renders covered-person details without pretending they are editable", async () => {
    mockComplianceDetailFetch();

    render(<ProjectSiteComplianceDetailsPanel siteId={projectSite.id} section="insurance" />);

    await screen.findByRole("heading", { name: "被保人员明细" });
    expect(screen.getAllByText(insurancePolicy.policyNo).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "被保人员明细" })).toBeInTheDocument();
    expect(screen.getByText("已覆盖")).toBeInTheDocument();
    expect(screen.queryByText(/被保人员明细后续开放/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /新增被保人员/ })).not.toBeInTheDocument();
  });
});
