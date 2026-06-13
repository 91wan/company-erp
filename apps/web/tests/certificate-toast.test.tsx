import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesWorkspace } from "../src/components/CertificatesWorkspace";
import { ToastProvider } from "../src/components/ui";
import { certificate, employee, party, projectSite } from "./appTestHelpers";

describe("CertificatesWorkspace 保存反馈", () => {
  it("证照保存成功后弹出 toast 确认", async () => {
    const created = {
      ...certificate,
      id: "53535353-5353-4353-8353-535353535353",
      certificateCode: "CERT0003",
      certificateName: "供应商营业执照",
      ownerType: "supplier" as const,
      ownerProjectSiteId: null,
      ownerProjectSiteName: null,
      ownerPartyId: party.id,
      ownerPartyName: party.partyName,
      ownerNameSnapshot: party.partyName,
      validityType: "long_term" as const,
      expiryDate: null,
      nextReviewDate: "2026-12-01",
      computedStatus: "valid" as const,
    };

    render(
      <ToastProvider>
        <CertificatesWorkspace
          loadCertificates={() => Promise.resolve([])}
          loadEmployees={() => Promise.resolve([employee])}
          loadProjectSites={() => Promise.resolve([projectSite])}
          loadParties={() => Promise.resolve([party])}
          createCertificate={vi.fn().mockResolvedValue(created)}
        />
      </ToastProvider>,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.click(screen.getByRole("button", { name: "上传证照图片" }));
    fireEvent.change(screen.getByLabelText("证照类型"), {
      target: { value: "business_license" },
    });
    fireEvent.change(screen.getByLabelText("归属对象"), {
      target: { value: "supplier" },
    });
    fireEvent.change(screen.getByLabelText("往来方"), {
      target: { value: party.id },
    });
    fireEvent.click(screen.getByText("复核补录信息"));
    fireEvent.change(screen.getByLabelText("证照名称（复核补录）"), {
      target: { value: "供应商营业执照" },
    });
    fireEvent.change(screen.getByLabelText("有效期类型"), {
      target: { value: "long_term" },
    });
    fireEvent.change(screen.getByLabelText("下次复核日期（可选）"), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存待复核记录" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("证照已保存"),
    );
  });
});
