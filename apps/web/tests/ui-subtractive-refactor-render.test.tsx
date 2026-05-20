import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesWorkspace } from "../src/components/CertificatesWorkspace";
import { ProjectSitesWorkspace } from "../src/components/ProjectSitesWorkspace";
import { ExternalProjectSitePortal } from "../src/components/project-sites/ExternalProjectSitePortal";
import { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
import {
  businessProject,
  certificate,
  contract,
  expiredCertificate,
  externalProjectSiteUser,
  material,
  party,
  projectSite,
  projectSiteComplianceSummary,
  projectSiteInvestmentSummary,
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  projectUsageRequest,
  purchaseRecord,
  purchaseRequest,
  warehouse,
} from "./appTestHelpers";

describe("UI subtractive refactor rendered surfaces", () => {
  it("renders project-site headquarters as one active task at a time", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadUsageOptions={() => Promise.resolve({
          defaultWarehouse: warehouse,
          materials: [{
            id: material.id,
            materialCode: material.materialCode,
            materialName: material.materialName,
            specification: material.specification,
            unit: material.baseUnit,
          }],
        })}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
        loadKitchenEquipment={() => Promise.resolve([projectSiteKitchenEquipment])}
        loadKitchenEquipmentChangeRequests={() => Promise.resolve([projectSiteKitchenEquipmentChangeRequest])}
        loadUnifiedAttachments={() => Promise.resolve([])}
        getAttachmentDownloadUrl={vi.fn()}
        canManage
      />,
    );

    expect(await screen.findByText("项目点风险台账")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.queryByLabelText("领用状态筛选")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "领用申请" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "厨房设备" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "投入合同" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "物料领用" }));
    expect(await screen.findByRole("heading", { name: "领用申请" })).toBeInTheDocument();
    expect(screen.queryByText("项目点风险台账")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "厨房设备" }));
    expect(await screen.findByRole("heading", { name: "厨房设备" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "领用申请" })).not.toBeInTheDocument();
  });

  it("renders purchase management as todo-first instead of showing request and record tables together", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([{ ...purchaseRequest, status: "pending_approval", submittedAt: "2026-05-20T08:00:00.000Z" }])}
        loadPurchaseRecords={() => Promise.resolve([purchaseRecord])}
        loadContracts={() => Promise.resolve([contract])}
      />,
    );

    expect(await screen.findByRole("heading", { name: "待审批" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "采购需求" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "采购执行" })).not.toBeInTheDocument();
    expect(screen.queryByText(purchaseRecord.purchaseNo)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "采购执行" }));
    expect(await screen.findByRole("heading", { name: "采购执行" })).toBeInTheDocument();
    expect(screen.getByText(purchaseRecord.purchaseNo)).toBeInTheDocument();
  });

  it("renders certificates as risk-first without showing the create form inline", async () => {
    render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([certificate, expiredCertificate])}
        loadEmployees={() => Promise.resolve([])}
        loadRosterPeople={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
      />,
    );

    expect(await screen.findByText("证照风险台账")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "风险" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("证照编码")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "待审核" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "待审核" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.queryByLabelText("证照编码")).not.toBeInTheDocument();
  });

  it("keeps external project-site users in a task portal without headquarters surfaces", () => {
    render(
      <ExternalProjectSitePortal
        section="overview"
        sites={[projectSite]}
        complianceSummaries={{ [projectSite.id]: projectSiteComplianceSummary }}
        visibleProjectSiteCount={1}
        pendingUsageCount={0}
        pendingEquipmentChangeCount={0}
        currentContactName={externalProjectSiteUser.externalProjectSiteContactName}
        currentContactPhone={externalProjectSiteUser.externalProjectSiteContactPhone}
        onSelectSection={vi.fn()}
      />,
    );

    const taskCards = screen.getByLabelText("项目点任务卡");
    expect(within(taskCards).getByText("资料待处理")).toBeInTheDocument();
    expect(within(taskCards).getByText("健康证/食品经营许可证")).toBeInTheDocument();
    expect(within(taskCards).getByText("雇主责任险/工资表")).toBeInTheDocument();
    expect(within(taskCards).getByText("物料领用")).toBeInTheDocument();
    expect(screen.queryByText("系统设置")).not.toBeInTheDocument();
    expect(screen.queryByText("全局附件管理")).not.toBeInTheDocument();
    expect(screen.queryByText(/成本价|采购价|库存金额|Storage Key/)).not.toBeInTheDocument();
  });
});
