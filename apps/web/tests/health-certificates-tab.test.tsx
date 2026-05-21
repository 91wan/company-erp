import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HealthCertificatesTab } from "../src/components/certificates/HealthCertificatesTab";
import type { CertificatesWorkspaceController } from "../src/components/certificates/useCertificatesWorkspaceController";
import { employee, expiredCertificate, rosterPerson } from "./appTestHelpers";

function renderHealthTab(certificates = [
  {
    ...expiredCertificate,
    id: "site-health",
    certificateCode: "HC-SITE-001",
    certificateName: "李现场健康证",
    ownerEmployeeId: null,
    ownerEmployeeName: null,
    ownerRosterPersonId: rosterPerson.id,
    ownerRosterPersonName: rosterPerson.personName,
    ownerRosterPersonProjectSiteId: rosterPerson.projectSiteId,
    ownerNameSnapshot: rosterPerson.personName,
    computedStatus: "expiring_soon" as const,
  },
  {
    ...expiredCertificate,
    id: "company-health",
    certificateCode: "HC-EMP-001",
    certificateName: "张三健康证",
    ownerEmployeeId: employee.id,
    ownerEmployeeName: employee.name,
    ownerRosterPersonId: null,
    ownerRosterPersonName: null,
    ownerRosterPersonProjectSiteId: null,
    ownerNameSnapshot: employee.name,
  },
]) {
  const model = {
    status: "ready",
    visibleCertificates: certificates,
    rosterPeople: [rosterPerson],
    setSelectedCertificateId: vi.fn(),
  } as unknown as CertificatesWorkspaceController;

  render(<HealthCertificatesTab model={model} />);
  return model;
}

describe("health certificates tab", () => {
  it("separates project-site and company health certificates", () => {
    renderHealthTab();

    expect(within(screen.getByRole("table")).getByText("项目点健康证")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("公司健康证")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("身份证后四位")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("健康证编号")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("发证机关")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("健康证类型"), { target: { value: "site" } });
    expect(within(screen.getByRole("table")).getByText("项目点健康证")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryByText("公司健康证")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("健康证类型"), { target: { value: "company" } });
    expect(within(screen.getByRole("table")).queryByText("项目点健康证")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("公司健康证")).toBeInTheDocument();
  });

  it("opens health certificate detail from table rows", () => {
    const model = renderHealthTab();

    fireEvent.click(within(screen.getByRole("table")).getByText("李现场健康证"));

    expect(model.setSelectedCertificateId).toHaveBeenCalledWith("site-health");
  });
});
