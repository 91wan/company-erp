import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalProjectSitePortal } from "../src/components/project-sites/ExternalProjectSitePortal";
import { jsonResponse, projectSite, projectSiteComplianceSummary, rosterPerson } from "./appTestHelpers";

const insurancePolicy = {
  id: "policy-1",
  projectSiteId: projectSite.id,
  projectSiteName: projectSite.siteName,
  policyNo: "ELI-2026-001",
  insurerName: "测试保险公司",
  startDate: "2026-05-01",
  endDate: "2027-04-30",
  attachmentPath: null,
  reviewStatus: "approved",
  reviewedByEmployeeId: null,
  reviewedByEmployeeName: null,
  reviewedAt: null,
  remark: null,
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExternalProjectSitePortal detail refresh", () => {
  it("refreshes compliance details after covered-person submission succeeds", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.includes("/api/project-site-roster-persons")) {
        return Promise.resolve(jsonResponse({ rosterPeople: [rosterPerson] }));
      }
      if (method === "GET" && url.includes("/api/employer-liability-insurance-policies")) {
        return Promise.resolve(jsonResponse({ insurancePolicies: [insurancePolicy] }));
      }
      if (method === "GET" && url.includes("/api/employer-liability-insurance-covered-persons")) {
        return Promise.resolve(jsonResponse({ coveredPersons: [] }));
      }
      if (method === "GET" && url.includes("/api/project-site-payroll-submissions")) {
        return Promise.resolve(jsonResponse({ payrollSubmissions: [] }));
      }
      if (method === "GET" && url.includes("/api/certificates")) {
        return Promise.resolve(jsonResponse({ certificates: [] }));
      }
      if (method === "POST" && url.includes("/api/employer-liability-insurance-covered-persons")) {
        return Promise.resolve(jsonResponse({ coveredPerson: { id: "covered-new" } }, true, 201));
      }

      return Promise.resolve(jsonResponse({}));
    });
    const coveredPersonDetailFetchCount = () =>
      fetchMock.mock.calls.filter(([url, init]) =>
        String(url).includes("/api/employer-liability-insurance-covered-persons") && (init?.method ?? "GET") === "GET",
      ).length;

    render(
      <ExternalProjectSitePortal
        section="insurance"
        sites={[projectSite]}
        complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
        visibleProjectSiteCount={1}
        pendingUsageCount={0}
        pendingEquipmentChangeCount={0}
        currentContactName="王项目"
        currentContactPhone="13900000000"
      />,
    );

    const form = await screen.findByRole("form", { name: "被保人员提交" });
    await waitFor(() => {
      expect(coveredPersonDetailFetchCount()).toBe(1);
    });

    fireEvent.click(within(form).getByRole("button", { name: "提交被保人员" }));

    expect(await screen.findByText("被保人员已提交，等待总部复核。")).toBeInTheDocument();
    await waitFor(() => {
      expect(coveredPersonDetailFetchCount()).toBeGreaterThanOrEqual(2);
    });
  });
});
