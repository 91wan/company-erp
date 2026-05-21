import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CertificateFilterToolbar,
  CertificateRiskTable,
} from "../src/components/certificates/CertificatesWorkspaceParts";
import { certificate, expiredCertificate, rosterPerson } from "./appTestHelpers";

// P0-3 helpers — health cert with no certificate number
const healthCertNoNumber = {
  ...expiredCertificate,
  id: "53535353-5353-4353-8353-535353535353",
  certificateCode: "CERT0003",
  certificateNumber: null,
} as typeof expiredCertificate;

const nonHealthCertNoNumber = {
  ...certificate,
  id: "54545454-5454-4454-8454-545454545454",
  certificateCode: "CERT0004",
  certificateNumber: null,
} as typeof certificate;

describe("certificates workspace presentation parts", () => {
  it("keeps certificate filtering in a reusable toolbar", () => {
    const onQueryChange = vi.fn();
    const onStatusFilterChange = vi.fn();

    render(
      <CertificateFilterToolbar
        query=""
        onQueryChange={onQueryChange}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("搜索证照、归属对象或编号"), { target: { value: "健康证" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "expired" } });

    expect(onQueryChange).toHaveBeenCalledWith("健康证");
    expect(onStatusFilterChange).toHaveBeenCalledWith("expired");
  });

  it("renders certificate risk rows and opens selection from rows", () => {
    const onSelectCertificate = vi.fn();

    render(
      <CertificateRiskTable
        status="ready"
        certificates={[certificate, expiredCertificate]}
        rosterPeople={[rosterPerson]}
        onSelectCertificate={onSelectCertificate}
      />,
    );

    expect(screen.getByText(certificate.certificateCode)).toBeInTheDocument();
    expect(screen.getByText(expiredCertificate.certificateCode)).toBeInTheDocument();

    fireEvent.click(screen.getByText(expiredCertificate.certificateCode));
    expect(onSelectCertificate).toHaveBeenCalledWith(expiredCertificate);
  });

  it("keeps the certificate risk ledger dense enough for the main workspace table", () => {
    render(
      <CertificateRiskTable
        status="ready"
        certificates={[certificate]}
        rosterPeople={[rosterPerson]}
        onSelectCertificate={vi.fn()}
      />,
    );

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toHaveLength(7);
    expect(headers).not.toContain("剩余天数");
    expect(headers).not.toContain("审核状态");
    expect(headers).not.toContain("人员匹配");
    expect(headers).toContain("关键状态");
  });

  // P0-3: health cert rows must never show "未录入证号"
  it("does not show 未录入证号 for health cert with null certificateNumber", () => {
    render(
      <CertificateRiskTable
        status="ready"
        certificates={[healthCertNoNumber]}
        rosterPeople={[rosterPerson]}
        onSelectCertificate={vi.fn()}
      />,
    );
    expect(screen.queryByText(/未录入证号/)).toBeNull();
  });

  it("shows 未录入证号 for non-health cert with null certificateNumber", () => {
    render(
      <CertificateRiskTable
        status="ready"
        certificates={[nonHealthCertNoNumber]}
        rosterPeople={[rosterPerson]}
        onSelectCertificate={vi.fn()}
      />,
    );
    expect(screen.getByText(/未录入证号/)).toBeInTheDocument();
  });

  it("does not show 未录入证号 for health cert even when certificateNumber is populated", () => {
    render(
      <CertificateRiskTable
        status="ready"
        certificates={[expiredCertificate]}
        rosterPeople={[rosterPerson]}
        onSelectCertificate={vi.fn()}
      />,
    );
    // expiredCertificate inherits certificateNumber "JY13202000000001" from certificate fixture
    // but it is a person_health_cert, so the number block is suppressed entirely
    expect(screen.queryByText(/未录入证号/)).toBeNull();
  });
});
