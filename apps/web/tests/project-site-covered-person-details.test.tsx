import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSiteComplianceDetailsPanel } from "../src/components/project-sites/ProjectSiteComplianceDetailsPanel";
import { certificate, projectSite, rosterPerson } from "./appTestHelpers";

const insurancePolicy = {
  id: "13131313-1313-4131-8131-131313131313",
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

describe("ProjectSiteComplianceDetailsPanel covered person details", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders employer liability insurance covered person rows from the readonly API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/project-site-roster-persons")) {
        return jsonResponse({ rosterPeople: [rosterPerson] });
      }
      if (url.includes("/api/certificates")) {
        return jsonResponse({ certificates: [certificate] });
      }
      if (url.includes("/api/employer-liability-insurance-policies")) {
        return jsonResponse({ insurancePolicies: [insurancePolicy] });
      }
      if (url.includes("/api/employer-liability-insurance-covered-persons")) {
        return jsonResponse({
          coveredPersons: [
            {
              id: "covered-person-1",
              policyId: "13131313-1313-4131-8131-131313131313",
              rosterPersonId: "12121212-1212-4121-8121-121212121212",
              rosterPersonName: "王现场",
              coveredNameSnapshot: "王现场",
              identityNoLast4Snapshot: "1234",
              remark: "已覆盖",
              createdAt: "2026-05-11T13:00:00.000Z",
              updatedAt: "2026-05-11T13:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/api/project-site-payroll-submissions")) {
        return jsonResponse({ payrollSubmissions: [payrollSubmission] });
      }
      throw new Error(`Unexpected request ${url}`);
    });

    render(<ProjectSiteComplianceDetailsPanel siteId={projectSite.id} section="insurance" />);

    expect(await screen.findByRole("heading", { name: "被保人员明细" })).toBeInTheDocument();
    expect(screen.getAllByText("王现场").length).toBeGreaterThan(0);
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.queryByText(/被保人员明细后续开放/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/employer-liability-insurance-covered-persons?projectSiteId=${projectSite.id}`),
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });
});

function jsonResponse(payload: unknown): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }));
}
