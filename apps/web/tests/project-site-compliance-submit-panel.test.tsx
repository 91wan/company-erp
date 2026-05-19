import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSiteComplianceSubmitPanel } from "../src/components/project-sites/ProjectSiteComplianceSubmitPanel";
import { jsonResponse, projectSite, rosterPerson } from "./appTestHelpers";

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

function mockSubmitPanelFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "GET" && url.includes("/api/project-site-roster-persons")) {
      return Promise.resolve(jsonResponse({ rosterPeople: [rosterPerson] }));
    }
    if (method === "GET" && url.includes("/api/employer-liability-insurance-policies")) {
      return Promise.resolve(jsonResponse({ insurancePolicies: [insurancePolicy] }));
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
    if (method === "POST" && url.includes("/api/employer-liability-insurance-covered-persons")) {
      return Promise.resolve(jsonResponse({ coveredPerson: { id: "covered-new" } }, true, 201));
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

  it("submits payroll records without exposing legacy paths or storage keys", async () => {
    const fetchMock = mockSubmitPanelFetch();

    render(<ProjectSiteComplianceSubmitPanel site={{ ...projectSite, payrollAgencyRequired: true }} section="payroll" currentContactName="王项目" />);

    expect(screen.getByText(/附件上传后续开放，当前由总部登记附件引用/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Storage Key/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/附件路径/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "提交工资表" }));

    await waitFor(() => {
      const payrollCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).includes("/api/project-site-payroll-submissions") && init?.method === "POST",
      );
      expect(payrollCall).toBeTruthy();
      const payload = JSON.parse(String(payrollCall?.[1]?.body));
      expect(payload).toMatchObject({ projectSiteId: projectSite.id, submittedBy: "王项目" });
      expect(payload).not.toHaveProperty("attachmentPath");
      expect(payload).not.toHaveProperty("storageKey");
    });
  });

  it("submits covered people against visible policy and active roster without owner or storage fields", async () => {
    const fetchMock = mockSubmitPanelFetch();

    render(<ProjectSiteComplianceSubmitPanel site={projectSite} section="insurance" currentContactName="王项目" />);

    const coveredPersonForm = await screen.findByRole("form", { name: "被保人员提交" });
    expect(within(coveredPersonForm).getByLabelText("雇主责任险保单")).toHaveValue(insurancePolicy.id);
    expect(within(coveredPersonForm).getByLabelText("绑定项目点现场人员")).toHaveValue(rosterPerson.id);
    expect(screen.queryByText(/被保人员明细维护后续开放/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Storage Key/i)).not.toBeInTheDocument();

    fireEvent.click(within(coveredPersonForm).getByRole("button", { name: "提交被保人员" }));

    await waitFor(() => {
      const coveredPersonCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).includes("/api/employer-liability-insurance-covered-persons") && init?.method === "POST",
      );
      expect(coveredPersonCall).toBeTruthy();
      const payload = JSON.parse(String(coveredPersonCall?.[1]?.body));
      expect(payload).toMatchObject({
        policyId: insurancePolicy.id,
        rosterPersonId: rosterPerson.id,
        coveredNameSnapshot: rosterPerson.personName,
        identityNoLast4Snapshot: rosterPerson.identityNoLast4,
      });
      expect(payload).not.toHaveProperty("projectSiteId");
      expect(payload).not.toHaveProperty("ownerEntityId");
      expect(payload).not.toHaveProperty("storageKey");
      expect(payload).not.toHaveProperty("attachmentPath");
    });
    expect(await screen.findByText("被保人员已提交，等待总部复核。")).toBeInTheDocument();
  });
});
