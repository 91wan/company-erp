import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesWorkspace, attachmentRecord, employee, party, projectSite, rosterPerson, certificate } from "./appTestHelpers";

describe("certificate image-first intake", () => {
  it("opens a photo-first certificate intake without certificate code as a business field", async () => {
    render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadRosterPeople={() => Promise.resolve([rosterPerson])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
      />,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.click(screen.getByRole("button", { name: "上传证照图片" }));

    expect(screen.getByRole("heading", { name: "上传证照图片" })).toBeInTheDocument();
    expect(screen.getByLabelText("证照图片或扫描件")).toBeInTheDocument();
    expect(screen.getByText("证照名称、到期日期由总部复核时补录，不再作为上传前必填项。")).toBeInTheDocument();
    expect(screen.queryByLabelText("证照编码")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("证件编码")).not.toBeInTheDocument();
    expect(screen.getByText("复核补录信息")).toBeInTheDocument();
  });

  it("creates a provisional certificate record and uploads the selected image to unified attachments", async () => {
    const created = {
      ...certificate,
      id: "64646464-6464-4464-8464-646464646464",
      certificateCode: "IMG-20260521-0001",
      certificateName: "营业执照（图片待复核）",
      ownerType: "company" as const,
      ownerPartyId: party.id,
      ownerPartyName: party.partyName,
      ownerNameSnapshot: party.partyName,
      validityType: "no_expiry_visible" as const,
      expiryDate: null,
      nextReviewDate: null,
      computedStatus: "archived" as const,
    };
    const createCertificate = vi.fn().mockResolvedValue(created);
    const uploadCertificateImage = vi.fn().mockResolvedValue({
      ...attachmentRecord,
      ownerModule: "certificates",
      ownerEntityType: "certificate",
      ownerEntityId: created.id,
    });

    render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadRosterPeople={() => Promise.resolve([rosterPerson])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        createCertificate={createCertificate}
        uploadCertificateImage={uploadCertificateImage}
      />,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.click(screen.getByRole("button", { name: "上传证照图片" }));
    fireEvent.change(screen.getByLabelText("证照类型"), { target: { value: "business_license" } });
    fireEvent.change(screen.getByLabelText("归属对象"), { target: { value: "company" } });
    fireEvent.change(screen.getByLabelText("往来方"), { target: { value: party.id } });
    fireEvent.change(screen.getByLabelText("证照图片或扫描件"), {
      target: {
        files: [new File(["png"], "01_营业执照.png", { type: "image/png" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存并上传图片" }));

    await waitFor(() => expect(createCertificate).toHaveBeenCalled());
    expect(createCertificate).toHaveBeenCalledWith(expect.objectContaining({
      certificateType: "business_license",
      ownerType: "company",
      ownerPartyId: party.id,
      certificateName: expect.stringContaining("营业执照"),
      validityType: "no_expiry_visible",
    }));
    expect(createCertificate.mock.calls[0][0].certificateCode).toMatch(/^IMG-/);
    expect(createCertificate.mock.calls[0][0]).not.toHaveProperty("attachmentPath");
    expect(createCertificate.mock.calls[0][0]).not.toHaveProperty("sourceFilePath");
    expect(uploadCertificateImage).toHaveBeenCalledWith(expect.objectContaining({
      ownerModule: "certificates",
      ownerEntityType: "certificate",
      ownerEntityId: created.id,
      displayName: "01_营业执照.png",
    }));
    expect(await screen.findByText("营业执照（图片待复核）")).toBeInTheDocument();
  });
});
