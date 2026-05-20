import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesWorkspace } from "../src/components/CertificatesWorkspace";
import { BusinessProjectsWorkspace } from "../src/components/BusinessProjectsWorkspace";
import { ContractsWorkspace } from "../src/components/ContractsWorkspace";
import { InventoryWorkspace } from "../src/components/InventoryWorkspace";
import { PartiesWorkspace } from "../src/components/PartiesWorkspace";
import { ProjectSitesWorkspace } from "../src/components/ProjectSitesWorkspace";
import { ExternalProjectSitePortal } from "../src/components/project-sites/ExternalProjectSitePortal";
import { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
import { ReplenishmentSuggestionsWorkspace } from "../src/components/ReplenishmentSuggestionsWorkspace";
import {
  businessProject,
  businessProjectSummary,
  certificate,
  contract,
  expiredCertificate,
  externalProjectSiteUser,
  employee,
  inventoryBalance,
  inventoryMovement,
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
  replenishmentSuggestion,
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

  it("keeps inventory, contracts, and master-data create flows out of the default page body", async () => {
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([inventoryMovement])}
        loadInventoryBalances={() => Promise.resolve([inventoryBalance])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadEmployees={() => Promise.resolve([employee])}
      />,
    );

    expect(await screen.findByRole("tab", { name: "库存风险" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("库存出入库登记表单")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "入库流水" }));
    expect(await screen.findByRole("button", { name: "新增入库流水" })).toBeInTheDocument();
    expect(screen.queryByLabelText("库存出入库登记表单")).not.toBeInTheDocument();
  });

  it("keeps contract and counterparty creation in drawer-only flows", async () => {
    const { unmount } = render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadUnifiedAttachments={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByRole("tab", { name: "合同风险" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("合同编号")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "合同台账" }));
    expect(screen.getByRole("button", { name: "新增合同" })).toBeInTheDocument();
    expect(screen.queryByLabelText("合同编号")).not.toBeInTheDocument();
    unmount();

    render(
      <PartiesWorkspace
        loadParties={() => Promise.resolve([party])}
        createParty={() => Promise.resolve(party)}
      />,
    );
    expect(await screen.findByText(party.partyCode)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增往来方" })).toBeInTheDocument();
    expect(screen.queryByLabelText("往来方编码")).not.toBeInTheDocument();
  });

  it("keeps business-project and replenishment conversion forms behind drawer actions", async () => {
    const { unmount } = render(
      <BusinessProjectsWorkspace
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadEmployees={() => Promise.resolve([employee])}
        loadInvestmentSummary={() => Promise.resolve(businessProjectSummary)}
      />,
    );

    expect(await screen.findByRole("tab", { name: "项目台账" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "新增业务项目" })).toBeInTheDocument();
    expect(screen.queryByLabelText("项目编码")).not.toBeInTheDocument();
    unmount();

    render(
      <ReplenishmentSuggestionsWorkspace
        loadSuggestions={() => Promise.resolve([replenishmentSuggestion])}
        generateSuggestions={() => Promise.resolve({ created: [], existingOpen: [replenishmentSuggestion], skipped: 0 })}
        updateSuggestion={() => Promise.resolve({ ...replenishmentSuggestion, status: "dismissed" })}
      />,
    );

    expect(await screen.findByText(replenishmentSuggestion.materialCode)).toBeInTheDocument();
    expect(screen.queryByLabelText("采购需求编号")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "转采购需求" }));
    expect(screen.getByLabelText("采购需求编号")).toBeInTheDocument();
  });
});
