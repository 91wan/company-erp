import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CertificateFilterToolbar,
  CertificateRiskTable,
} from "../src/components/certificates/CertificatesWorkspaceParts";
import { certificate, expiredCertificate, rosterPerson } from "./appTestHelpers";

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

    fireEvent.change(screen.getByPlaceholderText("搜索证照、归属对象或证照编号"), { target: { value: "健康证" } });
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
});
