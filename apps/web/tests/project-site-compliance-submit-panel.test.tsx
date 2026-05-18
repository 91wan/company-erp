import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSiteComplianceSubmitPanel } from "../src/components/project-sites/ProjectSiteComplianceSubmitPanel";
import { jsonResponse, projectSite, rosterPerson } from "./appTestHelpers";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockSubmitPanelFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "GET" && url.includes("/api/project-site-roster-persons")) {
      return Promise.resolve(jsonResponse({ rosterPeople: [rosterPerson] }));
    }
    if (method === "GET" && url.includes("/api/employer-liability-insurance-policies")) {
      return Promise.resolve(jsonResponse({ insurancePolicies: [] }));
    }
    if (method === "GET" && url.includes("/api/project-site-payroll-submissions")) {
      return Promise.resolve(jsonResponse({ payrollSubmissions: [] }));
    }
    if (method === "GET" && url.includes("/api/certificates")) {
      return Promise.resolve(jsonResponse({ certificates: [] }));
    }

    if (method === "POST" && url.includes("/api/project-site-roster-persons")) {
      return Promise.resolve(jsonResponse({ rosterPerson: { ...rosterPerson, personName: "赵现场" } }, true, 201));
    }
    if (method === "POST" && url.includes("/api/certificates")) {
      return Promise.resolve(jsonResponse({ certificate: { id: "cert-new" } }, true, 201));
    }
    if (method === "POST" && url.includes("/api/employer-liability-insurance-policies")) {
      return Promise.resolve(jsonResponse({ insurancePolicy: { id: "policy-new" } }, true, 201));
    }

    return Promise.resolve(jsonResponse({}));
  });
}

describe("ProjectSiteComplianceSubmitPanel", () => {
  it("lets an external project-site account submit a scoped roster person without choosing a project site", async () => {
    const fetchMock = mockSubmitPanelFetch();

    render(<ProjectSiteComplianceSubmitPanel site={projectSite} section="rosterHealth" currentContactName="王项目" />);

    fireEvent.change(screen.getByLabelText("现场人员姓名"), { target: { value: "赵现场" } });
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13911112222" } });
    fireEvent.change(screen.getByLabelText("身份证后四位"), { target: { value: "6789" } });
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "厨师" } });
    fireEvent.click(screen.getByRole("button", { name: "提交现场人员" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/project-site-roster-persons"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(`"projectSiteId":"${projectSite.id}"`),
        }),
      );
    });

    const rosterCall = fetchMock.mock.calls.find(([url, init]) =>
      String(url).includes("/api/project-site-roster-persons") && init?.method === "POST",
    );
    expect(JSON.parse(String(rosterCall?.[1]?.body))).toMatchObject({
      projectSiteId: projectSite.id,
      personName: "赵现场",
      identityNoLast4: "6789",
    });
    expect(screen.queryByLabelText("项目点")).not.toBeInTheDocument();
    expect(screen.queryByText(/Storage Key/i)).not.toBeInTheDocument();
    expect(screen.getByText(/附件由总部登记或后续上传接口支持/)).toBeInTheDocument();
  });

  it("creates health certificates and insurance policies with scoped owners only", async () => {
    const fetchMock = mockSubmitPanelFetch();

    render(<ProjectSiteComplianceSubmitPanel site={projectSite} section="rosterHealth" currentContactName="王项目" />);

    expect(await screen.findByText(rosterPerson.personName)).toBeInTheDocument();
    const certificateForm = screen.getByRole("form", { name: "健康证提交" });
    fireEvent.change(within(certificateForm).getByLabelText("绑定项目点现场人员"), { target: { value: rosterPerson.id } });
    fireEvent.change(within(certificateForm).getByLabelText("健康证编号"), { target: { value: "HC-2026-001" } });
    fireEvent.change(within(certificateForm).getByLabelText("签发日期"), { target: { value: "2026-05-01" } });
    fireEvent.change(within(certificateForm).getByLabelText("到期日期"), { target: { value: "2027-04-30" } });
    fireEvent.click(within(certificateForm).getByRole("button", { name: "提交健康证" }));

    await waitFor(() => {
      const certificateCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).includes("/api/certificates") && init?.method === "POST",
      );
      expect(certificateCall).toBeTruthy();
      expect(JSON.parse(String(certificateCall?.[1]?.body))).toMatchObject({
        ownerType: "person",
        ownerRosterPersonId: rosterPerson.id,
        certificateType: "person_health_cert",
      });
    });

    render(<ProjectSiteComplianceSubmitPanel site={projectSite} section="insurance" currentContactName="王项目" />);
    fireEvent.change(screen.getByLabelText("保单号"), { target: { value: "ELI-2026-001" } });
    fireEvent.change(screen.getByLabelText("保险公司"), { target: { value: "太平洋保险" } });
    fireEvent.change(screen.getByLabelText("保单开始日期"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText("保单结束日期"), { target: { value: "2027-04-30" } });
    fireEvent.click(screen.getByRole("button", { name: "提交雇主责任险保单" }));

    await waitFor(() => {
      const policyCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).includes("/api/employer-liability-insurance-policies") && init?.method === "POST",
      );
      expect(policyCall).toBeTruthy();
      expect(JSON.parse(String(policyCall?.[1]?.body))).toMatchObject({
        projectSiteId: projectSite.id,
        policyNo: "ELI-2026-001",
        attachmentPath: null,
      });
    });
  });
});
