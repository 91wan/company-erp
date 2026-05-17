import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { GenerateReplenishmentSuggestionsResult, ImportJobDto, InventoryBalanceDto } from "@company-erp/shared";
import {
  BusinessProjectsWorkspace,
  CertificatesWorkspace,
  ContractsWorkspace,
  ExcelImportWorkspace,
  InventoryWorkspace,
  MaterialsWarehousesWorkspace,
  PartiesWorkspace,
  PeoplePermissionsWorkspace,
  ProjectSitesWorkspace,
  PurchaseWorkspace,
  ReplenishmentSuggestionsWorkspace,
  attachmentRecord,
  businessProject,
  businessProjectSummary,
  certificate,
  contract,
  department,
  employee,
  expiredCertificate,
  expiredContract,
  externalProjectSiteAccount,
  importJob,
  importJobSummary,
  inventoryBalance,
  inventoryMovement,
  material,
  party,
  projectSite,
  projectSiteAssignment,
  projectSiteComplianceSummary,
  projectSiteInvestmentSummary,
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  rosterPerson,
  projectUsageRequest,
  purchaseRecord,
  purchaseRequest,
  replenishmentSuggestion,
  userAccount,
  warehouse,
} from "./appTestHelpers";
import { ApiRequestError } from "../src/apiClient";
import { complianceStatusTone } from "../src/components/project-sites/ProjectSiteCompliancePanel";

describe("Company ERP workspace components", () => {
  it("renders populated counterparty master data", async () => {
    render(<PartiesWorkspace loadParties={() => Promise.resolve([party])} />);

    expect(screen.getByRole("heading", { name: "往来单位" })).toBeInTheDocument();
    expect(screen.getByText("加载往来方资料...")).toBeInTheDocument();

    expect(await screen.findByText("晨光贸易有限公司")).toBeInTheDocument();
    expect(screen.getByText("SUP0001")).toBeInTheDocument();
    expect(screen.getAllByText("供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("启用")).toBeInTheDocument();
  });

  it("renders empty and error states for counterparty loading", async () => {
    const { rerender } = render(<PartiesWorkspace loadParties={() => Promise.resolve([])} />);

    expect(await screen.findByText("暂无往来方资料")).toBeInTheDocument();

    rerender(<PartiesWorkspace loadParties={() => Promise.reject(new Error("offline"))} />);

    expect(await screen.findByText("往来方资料加载失败")).toBeInTheDocument();
  });

  it("creates a counterparty from the form", async () => {
    const created = { ...party, partyCode: "CLI0001", partyName: "无锡科技园服务单位", partyTypes: ["client"] as const };

    render(
      <PartiesWorkspace
        loadParties={() => Promise.resolve([])}
        createParty={() => Promise.resolve(created)}
      />,
    );

    await screen.findByText("暂无往来方资料");
    fireEvent.change(screen.getByLabelText("往来方编码"), { target: { value: "CLI0001" } });
    fireEvent.change(screen.getByLabelText("往来方名称"), { target: { value: "无锡科技园服务单位" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "甲方客户/服务单位" }));
    fireEvent.click(screen.getByRole("button", { name: "保存往来方" }));

    expect(await screen.findByText("无锡科技园服务单位")).toBeInTheDocument();
    expect(screen.getByText("CLI0001")).toBeInTheDocument();
  });

  it("renders material and warehouse master data", async () => {
    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
      />,
    );

    expect(screen.getByRole("heading", { name: "物料与仓库" })).toBeInTheDocument();
    expect(screen.getByText("仓库基础")).toBeInTheDocument();
    expect(await screen.findByText("定制员工工服")).toBeInTheDocument();
    expect(screen.getByText("98 / 套")).toBeInTheDocument();
    expect(screen.getByText("项目点领用核算价")).toBeInTheDocument();
    expect(screen.getAllByText("WH-WX-HQ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("无锡总部仓库").length).toBeGreaterThan(0);
    expect(screen.getByText("MVP 只管理无锡总部真实库存，不管理项目点现场库存。")).toBeInTheDocument();
  });

  it("renders empty and error states for material and warehouse loading", async () => {
    const { rerender } = render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无物料资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无仓库资料")).toBeInTheDocument();

    rerender(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.reject(new Error("offline"))}
        loadWarehouses={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("物料资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("仓库资料加载失败")).toBeInTheDocument();
  });

  it("creates material and warehouse records from the forms", async () => {
    const createdMaterial = { ...material, materialCode: "MAT0002", materialName: "定制纸杯" };
    const createdWarehouse = { ...warehouse, warehouseCode: "WH-TEMP-01", warehouseName: "临时周转仓" };
    const createMaterial = vi.fn(() => Promise.resolve(createdMaterial));

    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={createMaterial}
        createWarehouse={() => Promise.resolve(createdWarehouse)}
      />,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.change(screen.getByLabelText("物料编码"), { target: { value: "MAT0002" } });
    fireEvent.change(screen.getByLabelText("物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("基本单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByLabelText("项目点领用收费"));
    fireEvent.change(screen.getByLabelText("采购参考价"), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText("项目点收费价"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("收费单位"), { target: { value: "箱" } });
    fireEvent.change(screen.getByLabelText("收费备注"), { target: { value: "项目点耗材核算" } });
    fireEvent.click(screen.getByLabelText("耗材"));
    fireEvent.click(screen.getByRole("button", { name: "保存物料" }));

    fireEvent.change(screen.getByLabelText("仓库编码"), { target: { value: "WH-TEMP-01" } });
    fireEvent.change(screen.getByLabelText("仓库名称"), { target: { value: "临时周转仓" } });
    fireEvent.click(screen.getByRole("button", { name: "保存仓库" }));

    expect(await screen.findByText("定制纸杯")).toBeInTheDocument();
    expect(await screen.findByText("临时周转仓")).toBeInTheDocument();
    expect(createMaterial).toHaveBeenCalledWith(
      expect.objectContaining({
        isProjectSiteSaleEnabled: true,
        purchaseReferencePrice: 12.5,
        projectSiteSalePrice: 15,
        projectSiteSaleUnit: "箱",
        projectSiteSaleRemark: "项目点耗材核算",
        isConsumable: true,
      }),
    );
  });

  it("shows material and warehouse creation failures", async () => {
    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={() => Promise.reject(new Error("duplicate material"))}
        createWarehouse={() => Promise.reject(new Error("duplicate warehouse"))}
      />,
    );

    await screen.findByText("暂无物料资料");
    fireEvent.change(screen.getByLabelText("物料编码"), { target: { value: "MAT0002" } });
    fireEvent.change(screen.getByLabelText("物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("基本单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存物料" }));

    fireEvent.change(screen.getByLabelText("仓库编码"), { target: { value: "WH-TEMP-01" } });
    fireEvent.change(screen.getByLabelText("仓库名称"), { target: { value: "临时周转仓" } });
    fireEvent.click(screen.getByRole("button", { name: "保存仓库" }));

    expect(await screen.findAllByText("保存失败，请检查编码是否重复或稍后重试。")).toHaveLength(2);
  });

  it("renders populated people and permissions master data", async () => {
    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([userAccount])}
        loadExternalProjectSiteAccounts={() => Promise.resolve([externalProjectSiteAccount])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([projectSiteAssignment])}
      />,
    );

    expect(screen.getByRole("heading", { name: "人员权限" })).toBeInTheDocument();
    expect(screen.getByText("部门管理")).toBeInTheDocument();
    expect(screen.getAllByText("公司员工").length).toBeGreaterThan(0);
    expect(screen.getByText("普通用户账号")).toBeInTheDocument();
    expect(screen.getAllByText("项目点账号").length).toBeGreaterThan(0);
    expect(screen.getByText("项目点账号代表当前现场负责人/项目经理，不代表分包主体，也不等同于项目点现场人员。")).toBeInTheDocument();
    expect(screen.getByText("项目点分配")).toBeInTheDocument();
    expect(screen.getByText("权限矩阵")).toBeInTheDocument();
    expect(await screen.findAllByText("人事行政部")).not.toHaveLength(0);
    expect(screen.getByText("EMP0001")).toBeInTheDocument();
    expect(screen.getAllByText("zhangsan").length).toBeGreaterThan(0);
    expect(await screen.findByText("王项目")).toBeInTheDocument();
    expect(screen.getAllByText("SITE-WX-001 科技园一期项目点").length).toBeGreaterThan(0);
    expect(screen.getAllByText("人事").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "停用" }));
    expect(screen.getByText("确认停用？")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认停用" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确认停用？")).not.toBeInTheDocument();
  });

  it("renders purchase request and purchase record workspace data", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([{ ...purchaseRequest, purpose: "库存补货建议" }])}
        loadPurchaseRecords={() => Promise.resolve([purchaseRecord])}
        loadContracts={() => Promise.resolve([contract])}
      />,
    );

    expect(screen.getByRole("heading", { name: "采购管理" })).toBeInTheDocument();
    expect(screen.getAllByText("采购需求").length).toBeGreaterThan(0);
    expect(screen.getAllByText("采购记录").length).toBeGreaterThan(0);
    expect(screen.getByText("新增采购需求")).toBeInTheDocument();
    expect(screen.getByText("新增采购记录")).toBeInTheDocument();
    expect(await screen.findByText("PR20260511001")).toBeInTheDocument();
    expect(screen.getByText("库存补货建议")).toBeInTheDocument();
    expect(screen.getByText("PO20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("HT20260511001 无锡项目点服务合同").length).toBeGreaterThan(0);
    expect(screen.getAllByText("定制员工工服").length).toBeGreaterThan(0);
    expect(screen.getByText("京东企业购")).toBeInTheDocument();
  });

  it("generates replenishment suggestions and converts one to a purchase request", async () => {
    const convertedRequest = {
      ...purchaseRequest,
      requestNo: "PR-REP-20260511001",
      status: "pending_purchase" as const,
      purpose: "库存补货建议",
      lines: [
        {
          ...purchaseRequest.lines[0],
          materialId: material.id,
          materialCode: material.materialCode,
          requestedQuantity: 24,
        },
      ],
    };
    const generated: GenerateReplenishmentSuggestionsResult = {
      created: [],
      existingOpen: [replenishmentSuggestion],
      skipped: 0,
    };

    render(
      <ReplenishmentSuggestionsWorkspace
        loadSuggestions={() => Promise.resolve([replenishmentSuggestion])}
        generateSuggestions={() => Promise.resolve(generated)}
        convertSuggestion={() =>
          Promise.resolve({
            replenishmentSuggestion: {
              ...replenishmentSuggestion,
              status: "converted",
              convertedPurchaseRequestId: convertedRequest.id,
              convertedPurchaseRequestNo: convertedRequest.requestNo,
            },
            purchaseRequest: convertedRequest,
          })
        }
        updateSuggestion={() => Promise.resolve({ ...replenishmentSuggestion, status: "dismissed" })}
      />,
    );

    expect(await screen.findByText("补货建议")).toBeInTheDocument();
    expect(screen.getByText("MAT0001")).toBeInTheDocument();
    expect(screen.getByText("建议 24 套")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成补货建议" }));
    expect(within(screen.getByLabelText("补货建议摘要")).getByText("待确认建议")).toBeInTheDocument();
    expect(within(screen.getByLabelText("补货建议摘要")).getByText("1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR-REP-20260511001" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王仓管" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "仓储部" } });
    fireEvent.submit(screen.getByRole("button", { name: "转采购需求" }).closest("form")!);

    expect(await screen.findByText("已转采购需求：PR-REP-20260511001")).toBeInTheDocument();
  });

  it("renders inventory movement and balance data", async () => {
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([inventoryMovement])}
        loadInventoryBalances={() => Promise.resolve([inventoryBalance])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
      />,
    );

    expect(screen.getByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(screen.getAllByText("入库登记").length).toBeGreaterThan(0);
    expect(screen.getAllByText("库存流水").length).toBeGreaterThan(0);
    expect(screen.getAllByText("当前库存查询").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "公司内部出库 后续开放" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "项目点领用出库 请到项目点模块办理" })).not.toBeInTheDocument();
    expect(screen.getByText("公司内部出库暂未开放；项目点领用出库请到项目点模块办理。")).toBeInTheDocument();
    expect(within(screen.getByLabelText("流水类型")).queryByRole("option", { name: "出库" })).not.toBeInTheDocument();
    expect(await screen.findByText("RK20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("WH-WX-HQ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MAT0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("低库存").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("RK20260511001"));
    expect(await screen.findByRole("heading", { name: "库存流水详情" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    fireEvent.click(screen.getAllByText("2026-05-11")[1]);
    expect(await screen.findByRole("heading", { name: "库存余额详情" })).toBeInTheDocument();
  });

  it("renders inventory empty and error states", async () => {
    const { rerender } = render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve([])}
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无库存流水")).toBeInTheDocument();
    expect(await screen.findByText("暂无当前库存")).toBeInTheDocument();

    rerender(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.reject(new Error("offline"))}
        loadInventoryBalances={() => Promise.reject(new Error("offline"))}
        loadMaterials={() => Promise.reject(new Error("offline"))}
        loadWarehouses={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("库存流水接口暂不可用")).toBeInTheDocument();
    expect(await screen.findByText("当前库存接口暂不可用")).toBeInTheDocument();
    expect(await screen.findByText("物料或仓库接口暂不可用，暂不能登记入库。")).toBeInTheDocument();
  });

  it("creates an inbound inventory movement and refreshes balances", async () => {
    let balances = [] as InventoryBalanceDto[];
    const createdMovement = { ...inventoryMovement, movementNo: "RK20260511002", quantity: 8 };
    const refreshedBalance = { ...inventoryBalance, currentQuantity: 20, isLowStock: false };

    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve(balances)}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        createInventoryMovement={() => {
          balances = [refreshedBalance];
          return Promise.resolve(createdMovement);
        }}
      />,
    );

    await screen.findByText("暂无库存流水");
    fireEvent.change(screen.getByLabelText("入库单号"), { target: { value: "RK20260511002" } });
    fireEvent.change(screen.getByLabelText("入库日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("入库数量"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("经办人"), { target: { value: "王仓管" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("RK20260511002")).toBeInTheDocument();
    expect(await screen.findByText("20 套")).toBeInTheDocument();
  });

  it("shows inventory creation failures", async () => {
    render(
      <InventoryWorkspace
        loadInventoryMovements={() => Promise.resolve([])}
        loadInventoryBalances={() => Promise.resolve([])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        createInventoryMovement={() => Promise.reject(new Error("duplicate movement"))}
      />,
    );

    await screen.findByText("暂无库存流水");
    fireEvent.change(screen.getByLabelText("入库单号"), { target: { value: "RK20260511002" } });
    fireEvent.change(screen.getByLabelText("入库日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("入库数量"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("入库登记失败，请检查必填项或单号是否重复。")).toBeInTheDocument();
  });

  it("renders project site and usage request workspace data", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
      />,
    );

    expect(screen.getByRole("heading", { name: "项目点" })).toBeInTheDocument();
    expect(screen.getAllByText("项目点台账").length).toBeGreaterThan(0);
    expect(screen.getAllByText("领用申请").length).toBeGreaterThan(0);
    expect(screen.getAllByText("出库登记").length).toBeGreaterThan(0);
    expect(screen.getByText("新增项目点")).toBeInTheDocument();
    expect(screen.getByText("新增领用申请")).toBeInTheDocument();
    expect(screen.queryByLabelText("项目点编码")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新增项目点" }));
    expect(screen.getByLabelText("项目点编码")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(await screen.findByText("SITE-WX-001")).toBeInTheDocument();
    expect(screen.getAllByText("科技园一期项目点").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("SITE-WX-001"));
    expect(await screen.findByRole("heading", { name: "SITE-WX-001 科技园一期项目点" })).toBeInTheDocument();
    for (const tab of ["合规摘要", "物料领用", "厨房设备"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("tab", { name: "健康证" })).not.toBeInTheDocument();
    expect(screen.queryByText("待后端明细接口支持")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.getByText("投入合同")).toBeInTheDocument();
    expect(await screen.findByText("装修/改造")).toBeInTheDocument();
    expect(screen.getByText("¥260,000.00")).toBeInTheDocument();
    expect(screen.getByText("USE20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("MAT0001 定制员工工服").length).toBeGreaterThan(0);
  });

  it("keeps project-site kitchen equipment forms out of the legacy attachment path workflow", async () => {
    const createKitchenEquipment = vi.fn().mockResolvedValue(projectSiteKitchenEquipment);
    const createChangeRequest = vi.fn().mockResolvedValue(projectSiteKitchenEquipmentChangeRequest);
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        loadKitchenEquipment={() => Promise.resolve([projectSiteKitchenEquipment])}
        createKitchenEquipment={createKitchenEquipment}
        createKitchenEquipmentChangeRequest={createChangeRequest}
      />,
    );

    await screen.findByText("SITE-WX-001");
    fireEvent.click(screen.getByRole("button", { name: "新增厨房设备" }));
    expect(screen.queryByText("附件引用（历史兼容）")).not.toBeInTheDocument();
    expect(screen.queryByText("不要填写 NAS 绝对路径")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("设备名称"), { target: { value: "单头大锅灶" } });
    fireEvent.change(screen.getByLabelText("数量"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "保存设备" }));

    expect(await screen.findByText("SITE-WX-001")).toBeInTheDocument();
    expect(createKitchenEquipment).toHaveBeenCalledWith(expect.not.objectContaining({ attachmentPath: expect.anything() }));

    fireEvent.click(screen.getByRole("button", { name: "上报设备变更" }));
    expect(screen.queryByText("照片/附件引用（历史兼容）")).not.toBeInTheDocument();
    expect(screen.queryByText("不要填写 NAS 绝对路径")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("设备名称"), { target: { value: "六门冰柜" } });
    fireEvent.change(screen.getByLabelText("说明"), { target: { value: "门封条损坏" } });
    fireEvent.click(screen.getByRole("button", { name: "提交上报" }));

    expect(createChangeRequest).toHaveBeenCalledWith(expect.not.objectContaining({ attachmentPath: expect.anything() }));
  });

  it("does not render unavailable project-site roadmap items as disabled action buttons", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        createProjectSite={() => Promise.resolve(projectSite)}
        createUsageRequest={() => Promise.resolve(projectUsageRequest)}
        issueUsageRequest={() => Promise.resolve(projectUsageRequest)}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
        loadKitchenEquipment={() => Promise.resolve([projectSiteKitchenEquipment])}
        createKitchenEquipment={() => Promise.resolve(projectSiteKitchenEquipment)}
        loadKitchenEquipmentChangeRequests={() => Promise.resolve([projectSiteKitchenEquipmentChangeRequest])}
        createKitchenEquipmentChangeRequest={() => Promise.resolve(projectSiteKitchenEquipmentChangeRequest)}
        reviewKitchenEquipmentChangeRequest={() => Promise.resolve(projectSiteKitchenEquipmentChangeRequest)}
      />,
    );

    expect(await screen.findByRole("heading", { name: "项目点" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "月度经营报表 后续开放" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "现场库存 后续开放" })).not.toBeInTheDocument();
    expect(screen.getByText("月度经营报表、现场库存尚未开放；当前只展示可办理的项目点台账、领用、厨房设备和总部出库入口。")).toBeInTheDocument();
  });

  it("shows unified business attachment references in project-site details", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        loadUnifiedAttachments={() =>
          Promise.resolve([
            {
              ...attachmentRecord,
              ownerModule: "project-sites",
              ownerEntityType: "project_site",
              ownerEntityId: projectSite.id,
            },
          ])
        }
      />,
    );

    await screen.findByText("SITE-WX-001");
    fireEvent.click(screen.getByText("SITE-WX-001"));
    fireEvent.click(screen.getByRole("tab", { name: "统一附件" }));

    expect(await screen.findByText("DEMO 合同附件")).toBeInTheDocument();
    expect(screen.queryByText("contracts/demo-contract.pdf")).not.toBeInTheDocument();
  });

  it("shows compliance task queue in project-site detail overview", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([{ ...projectSite, payrollAgencyRequired: true }])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
      />,
    );

    await screen.findByText("SITE-WX-001");
    fireEvent.click(screen.getByText("SITE-WX-001"));

    expect(await screen.findByText("合规任务队列")).toBeInTheDocument();
    expect(screen.getByText("健康证阻断")).toBeInTheDocument();
    expect(screen.getByText("食品经营许可证预警")).toBeInTheDocument();
    expect(screen.getByText("雇主责任险覆盖异常")).toBeInTheDocument();
    expect(screen.getByText("工资表待审核")).toBeInTheDocument();
    expect(screen.queryByText("处理现场人员/健康证")).not.toBeInTheDocument();
    expect(screen.queryByText("处理食品经营许可证")).not.toBeInTheDocument();
    expect(screen.getAllByText("待后端支持").length).toBeGreaterThan(0);
  });

  it("renders a single project-site risk table with compliance status and opens details", async () => {
    render(
      <ProjectSitesWorkspace
        loadProjectSites={() =>
          Promise.resolve([
            {
              ...projectSite,
              serviceMode: "subcontracted",
              subcontractorPartyId: party.id,
              subcontractorPartyName: "个人承包人王某",
              subcontractorContactName: "王项目",
              payrollAgencyRequired: false,
            },
          ])
        }
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
      />,
    );

    expect(await screen.findByText("项目点风险台账")).toBeInTheDocument();
    expect(screen.getByText("项目点现场人员")).toBeInTheDocument();
    expect(screen.getAllByText("雇主责任险").length).toBeGreaterThan(0);
    expect(screen.getByText("健康证")).toBeInTheDocument();
    expect(screen.getByText("食品经营许可证")).toBeInTheDocument();
    expect(screen.getAllByText("工资表").length).toBeGreaterThan(0);
    expect(screen.getByText("个人承包人王某")).toBeInTheDocument();
    expect(await screen.findByText("12 人")).toBeInTheDocument();
    expect(screen.getByText("缺失 1 / 临期 2 / 过期 1")).toBeInTheDocument();
    expect(screen.getByText("未覆盖 1 / 临期 1 / 过期 0")).toBeInTheDocument();
    expect(screen.getAllByText("即将到期").length).toBeGreaterThan(0);
    expect(screen.getByText("不需要")).toBeInTheDocument();
    expect(screen.getByText("红色风险")).toHaveClass("red");

    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    expect(await screen.findByText("合规任务队列")).toBeInTheDocument();
  });

  it("maps project-site compliance states to red, orange, green, and gray risk tones", () => {
    for (const status of ["blocking", "red", "missing", "expired", "rejected", "review_due"]) {
      expect(complianceStatusTone(status)).toBe("red");
    }
    for (const status of ["warning", "expiring", "expiring_soon", "pending", "review_due_soon"]) {
      expect(complianceStatusTone(status)).toBe("orange");
    }
    for (const status of ["valid", "approved"]) {
      expect(complianceStatusTone(status)).toBe("green");
    }
    for (const status of ["not_required", "not_applicable"]) {
      expect(complianceStatusTone(status)).toBe("gray");
    }
  });

  it("shows the bound external project site even when there are no usage requests", async () => {
    render(
      <ProjectSitesWorkspace
        usageOnly
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([])}
        loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
        loadUsageOptions={() =>
          Promise.resolve({
            defaultWarehouse: { id: warehouse.id, warehouseCode: warehouse.warehouseCode, warehouseName: warehouse.warehouseName },
            materials: [{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: "套" }],
          })
        }
        loadKitchenEquipment={() => Promise.resolve([])}
        loadKitchenEquipmentChangeRequests={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("科技园一期项目点")).toBeInTheDocument();
    expect(screen.getAllByText("我的项目点").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(await screen.findByText("红色风险")).toBeInTheDocument();
    expect(screen.getByText(/暂无可见领用申请/)).toBeInTheDocument();
  });

  it("shows actionable compliance tasks in the external project-site portal", async () => {
    const onPortalSectionChange = vi.fn();
    render(
      <ProjectSitesWorkspace
        usageOnly
        portalSection="overview"
        onPortalSectionChange={onPortalSectionChange}
        loadProjectSites={() => Promise.resolve([{ ...projectSite, payrollAgencyRequired: true }])}
        loadUsageRequests={() => Promise.resolve([])}
        loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
        loadUsageOptions={() =>
          Promise.resolve({
            defaultWarehouse: { id: warehouse.id, warehouseCode: warehouse.warehouseCode, warehouseName: warehouse.warehouseName },
            materials: [{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: "套" }],
          })
        }
        loadKitchenEquipment={() => Promise.resolve([])}
        loadKitchenEquipmentChangeRequests={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("合规任务队列")).toBeInTheDocument();
    expect((await screen.findAllByText("健康证阻断")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("食品经营许可证预警").length).toBeGreaterThan(0);
    expect(screen.getAllByText("雇主责任险覆盖异常").length).toBeGreaterThan(0);
    expect(screen.getAllByText("工资表待审核").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "处理健康证阻断" }));
    expect(onPortalSectionChange).toHaveBeenCalledWith("rosterHealth");
    fireEvent.click(screen.getByRole("button", { name: "处理雇主责任险覆盖异常" }));
    expect(onPortalSectionChange).toHaveBeenCalledWith("insurance");
    fireEvent.click(screen.getByRole("button", { name: "处理工资表待审核" }));
    expect(onPortalSectionChange).toHaveBeenCalledWith("payroll");
  });

  it("switches external project-site portal sections to real task guidance", async () => {
    function PortalHarness() {
      const [section, setSection] = useState<"overview" | "usage" | "rosterHealth" | "foodLicense" | "insurance" | "payroll">("overview");
      return (
        <ProjectSitesWorkspace
          usageOnly
          portalSection={section}
          onPortalSectionChange={setSection}
          externalProjectSiteContactName="王项目"
          externalProjectSiteContactPhone="13900000000"
          loadProjectSites={() => Promise.resolve([{ ...projectSite, payrollAgencyRequired: true }])}
          loadUsageRequests={() => Promise.resolve([])}
          loadComplianceSummary={() => Promise.resolve(projectSiteComplianceSummary)}
          loadUsageOptions={() =>
            Promise.resolve({
              defaultWarehouse: { id: warehouse.id, warehouseCode: warehouse.warehouseCode, warehouseName: warehouse.warehouseName },
              materials: [{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: "套" }],
            })
          }
          loadKitchenEquipment={() => Promise.resolve([])}
          loadKitchenEquipmentChangeRequests={() => Promise.resolve([])}
        />
      );
    }

    render(<PortalHarness />);

    expect(await screen.findByText("当前项目经理：王项目")).toBeInTheDocument();
    expect(screen.getByText("联系电话：13900000000")).toBeInTheDocument();
    expect((await screen.findAllByText("健康证阻断")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^雇主责任险提交$/ }));
    expect((await screen.findAllByRole("heading", { name: "雇主责任险提交" })).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/待总部系统开放明细维护/).length).toBeGreaterThan(0);
    expect(screen.getByText(/附件由总部登记或后续上传接口支持/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Storage Key/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^工资表提交$/ }));
    expect((await screen.findAllByRole("heading", { name: "工资表提交" })).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/待总部系统开放明细维护/).length).toBeGreaterThan(0);
    expect(screen.getByText(/附件由总部登记或后续上传接口支持/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Storage Key/i)).not.toBeInTheDocument();
  });

  it("renders project-site kitchen equipment and lets site users report changes", async () => {
    const createChangeRequest = vi.fn().mockResolvedValue({
      ...projectSiteKitchenEquipmentChangeRequest,
      id: "96969696-9696-4969-8969-969696969696",
      description: "门封条损坏",
    });

    render(
      <ProjectSitesWorkspace
        usageOnly
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadUsageOptions={() =>
          Promise.resolve({
            defaultWarehouse: { id: warehouse.id, warehouseCode: warehouse.warehouseCode, warehouseName: warehouse.warehouseName },
            materials: [{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, unit: "套" }],
          })
        }
        loadKitchenEquipment={() => Promise.resolve([projectSiteKitchenEquipment])}
        loadKitchenEquipmentChangeRequests={() => Promise.resolve([projectSiteKitchenEquipmentChangeRequest])}
        createKitchenEquipmentChangeRequest={createChangeRequest}
      />,
    );

    expect((await screen.findAllByText("厨房设备")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("六门冰柜").length).toBeGreaterThan(0);
    expect(screen.getByText("冷藏设备")).toBeInTheDocument();
    expect(screen.getByText("2 台")).toBeInTheDocument();
    expect(screen.getByText("WX-ZC-ICE-001")).toBeInTheDocument();
    expect(screen.getByText("压缩机异响，需要维修")).toBeInTheDocument();

    expect(screen.queryByLabelText("关联设备")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "上报设备变更" }));
    fireEvent.change(screen.getByLabelText("关联设备"), { target: { value: projectSiteKitchenEquipment.id } });
    fireEvent.change(screen.getByLabelText("设备名称"), { target: { value: "六门冰柜" } });
    fireEvent.change(screen.getByLabelText("变更状态"), { target: { value: "damaged" } });
    fireEvent.change(screen.getByLabelText("说明"), { target: { value: "门封条损坏" } });
    fireEvent.click(screen.getByRole("button", { name: "提交上报" }));

    expect(createChangeRequest).toHaveBeenCalled();
    expect(await screen.findByText("门封条损坏")).toBeInTheDocument();
    expect(createChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        projectSiteId: "",
        equipmentId: projectSiteKitchenEquipment.id,
        equipmentName: "六门冰柜",
        proposedStatus: "damaged",
        description: "门封条损坏",
      }),
    );
  });

  it("requires confirmation before reviewing kitchen equipment change requests", async () => {
    const reviewedRequest = {
      ...projectSiteKitchenEquipmentChangeRequest,
      reviewStatus: "approved" as const,
    };
    const reviewKitchenEquipmentChangeRequest = vi.fn(() => Promise.resolve(reviewedRequest));

    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        loadKitchenEquipment={() => Promise.resolve([projectSiteKitchenEquipment])}
        loadKitchenEquipmentChangeRequests={() => Promise.resolve([projectSiteKitchenEquipmentChangeRequest])}
        reviewKitchenEquipmentChangeRequest={reviewKitchenEquipmentChangeRequest}
      />,
    );

    expect(await screen.findByText("压缩机异响，需要维修")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "通过" }));
    expect(reviewKitchenEquipmentChangeRequest).not.toHaveBeenCalled();
    expect(screen.getByText("确认通过？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确认通过？")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "通过" }));
    fireEvent.click(screen.getByRole("button", { name: "确认通过" }));

    expect(reviewKitchenEquipmentChangeRequest).toHaveBeenCalledWith(projectSiteKitchenEquipmentChangeRequest.id, { reviewStatus: "approved" });
  });

  it("renders project site empty and error states", async () => {
    const { rerender } = render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([])}
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        loadBusinessProjects={() => Promise.resolve([])}
        loadInvestmentSummary={() => Promise.resolve({ ...projectSiteInvestmentSummary, contractCount: 0, totalAmount: 0, categories: [] })}
      />,
    );

    expect(await screen.findByText("暂无项目点风险台账")).toBeInTheDocument();
    expect(await screen.findByText("暂无领用申请")).toBeInTheDocument();

    rerender(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadUsageRequests={() => Promise.reject(new Error("offline"))}
        loadParties={() => Promise.reject(new Error("offline"))}
        loadMaterials={() => Promise.reject(new Error("offline"))}
        loadWarehouses={() => Promise.reject(new Error("offline"))}
        loadBusinessProjects={() => Promise.reject(new Error("offline"))}
        loadInvestmentSummary={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("项目点风险台账加载失败")).toBeInTheDocument();
    expect(await screen.findByText("领用申请加载失败")).toBeInTheDocument();
    expect(await screen.findByText("项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。")).toBeInTheDocument();
  });

  it("creates a project site and usage request", async () => {
    const createdSite = {
      ...projectSite,
      siteCode: "SITE-WX-002",
      siteName: "滨江项目点",
      businessProjectId: businessProject.id,
      businessProjectName: businessProject.projectName,
    };
    const createdRequest = { ...projectUsageRequest, requestNo: "USE20260511002", projectSiteName: "滨江项目点" };
    const createProjectSite = vi.fn(() => Promise.resolve(createdSite));

    render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([])}
        loadUsageRequests={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        createProjectSite={createProjectSite}
        createUsageRequest={() => Promise.resolve(createdRequest)}
      />,
    );

    await screen.findByText("暂无项目点风险台账");
    fireEvent.click(screen.getByRole("button", { name: "新增项目点" }));
    fireEvent.change(screen.getByLabelText("项目点编码"), { target: { value: "SITE-WX-002" } });
    fireEvent.change(screen.getByLabelText("项目点名称"), { target: { value: "滨江项目点" } });
    fireEvent.change(screen.getByLabelText("业务项目"), { target: { value: businessProject.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存项目点" }));

    expect(await screen.findByText("SITE-WX-002")).toBeInTheDocument();
    expect(createProjectSite).toHaveBeenCalledWith(expect.objectContaining({ businessProjectId: businessProject.id }));
    expect(screen.getAllByText("滨江项目点").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "新增领用申请" }));
    fireEvent.change(screen.getByLabelText("领用申请单号"), { target: { value: "USE20260511002" } });
    fireEvent.change(screen.getByLabelText("申请日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getAllByLabelText("项目点").find((element) => element.tagName === "SELECT")!, {
      target: { value: projectSite.id },
    });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.change(screen.getByLabelText("申请数量"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存领用申请" }));

    expect(await screen.findByText("USE20260511002")).toBeInTheDocument();
  });

  it("issues a project usage request and shows failures", async () => {
    const issuedRequest = {
      ...projectUsageRequest,
      issuedQuantity: 10,
      outboundNo: "OUT20260511001",
      chargeAmount: 980,
      unitChargePrice: 98,
      chargePriceSource: "project_site_price" as const,
      chargeRemark: "项目点领用核算价",
      lastIssuedAt: "2026-05-11",
      lastReceivedByName: "项目点领用人",
      status: "issued" as const,
    };
    const issueUsageRequest = vi.fn(() => Promise.resolve(issuedRequest));
    const { rerender } = render(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        issueUsageRequest={issueUsageRequest}
      />,
    );

    await screen.findByText("USE20260511001");
    expect(screen.queryByLabelText("出库单号")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "出库登记" }));
    fireEvent.change(screen.getByLabelText("领用申请"), { target: { value: projectUsageRequest.id } });
    fireEvent.change(screen.getByLabelText("出库单号"), { target: { value: "OUT20260511001" } });
    fireEvent.change(screen.getByLabelText("领用时间"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("出库数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("领用人"), { target: { value: "项目点领用人" } });
    fireEvent.click(screen.getByRole("button", { name: "执行出库" }));
    expect(issueUsageRequest).not.toHaveBeenCalled();
    expect(screen.getByText("确认执行本次出库？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确认执行本次出库？")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "执行出库" }));
    fireEvent.click(screen.getByRole("button", { name: "确认出库" }));

    expect(issueUsageRequest).toHaveBeenCalledWith(projectUsageRequest.id, expect.objectContaining({ outboundNo: "OUT20260511001", quantity: 10 }));
    expect((await screen.findAllByText("已出库")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("10 套")).length).toBeGreaterThan(0);
    expect(await screen.findByText("¥980.00")).toBeInTheDocument();
    expect(await screen.findByText("项目点领用人")).toBeInTheDocument();
    expect((await screen.findAllByText("2026-05-11")).length).toBeGreaterThan(0);

    rerender(
      <ProjectSitesWorkspace
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadUsageRequests={() => Promise.resolve([projectUsageRequest])}
        loadParties={() => Promise.resolve([party])}
        loadMaterials={() => Promise.resolve([material])}
        loadWarehouses={() => Promise.resolve([warehouse])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadInvestmentSummary={() => Promise.resolve(projectSiteInvestmentSummary)}
        issueUsageRequest={() => Promise.reject(new Error("insufficient stock"))}
      />,
    );

    await screen.findByText("USE20260511001");
    fireEvent.click(screen.getByRole("button", { name: "出库登记" }));
    fireEvent.change(screen.getByLabelText("出库单号"), { target: { value: "OUT20260511002" } });
    fireEvent.change(screen.getByLabelText("领用时间"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("出库数量"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "执行出库" }));
    fireEvent.click(screen.getByRole("button", { name: "确认出库" }));

    expect(await screen.findByText("出库失败，请检查库存余额、单号或申请状态。")).toBeInTheDocument();
  });

  it("renders contract ledger without promoting legacy attachment paths", async () => {
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract, expiredContract])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "合同台账" }).length).toBeGreaterThan(0);
    expect(screen.getByText("新增合同")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记附件路径" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "附件路径" })).not.toBeInTheDocument();
    expect(await screen.findByText("HT20260511001")).toBeInTheDocument();
    expect(screen.getByText("无锡项目点服务合同")).toBeInTheDocument();
    expect(screen.getAllByText("即将到期").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已到期").length).toBeGreaterThan(0);
    expect(screen.getAllByText("投入分类").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合同形态").length).toBeGreaterThan(0);
    expect(screen.getAllByText("合同标的").length).toBeGreaterThan(0);
    expect(screen.getAllByText("业务项目").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "新增合同" }));
    const directionSelect = screen.getByLabelText("合同方向") as HTMLSelectElement;
    expect(Array.from(directionSelect.options).map((option) => option.textContent)).not.toContain("框架合同");
    fireEvent.click(screen.getByRole("cell", { name: "HT20260511001" }));
    expect(await screen.findByText("统一附件")).toBeInTheDocument();
    expect(screen.getByText("历史路径/兼容字段")).toBeInTheDocument();
    expect(screen.getByText("主附件引用（历史路径）")).toBeInTheDocument();
  });

  it("shows unified business attachment references in contract details", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract])}
        loadUnifiedAttachments={() => Promise.resolve([attachmentRecord])}
        getUnifiedAttachmentDownloadUrl={() => Promise.resolve(`/api/attachments/${attachmentRecord.id}/content`)}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
      />,
    );

    await screen.findByText("HT20260511001");
    fireEvent.click(screen.getByRole("cell", { name: "HT20260511001" }));

    expect(await screen.findByText("统一附件")).toBeInTheDocument();
    expect(await screen.findByText("DEMO 合同附件")).toBeInTheDocument();
    expect(screen.getByText("历史路径/兼容字段")).toBeInTheDocument();
    expect(screen.queryByLabelText("Storage Key")).not.toBeInTheDocument();
    expect(screen.queryByText("contracts/demo-contract.pdf")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下载/打开 DEMO 合同附件" }));

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith(
      "http://localhost:3001/api/attachments/cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd/content",
      "_blank",
      "noopener,noreferrer",
    ));
    openSpy.mockRestore();
  });

  it("shows scoped attachment metadata errors without exposing paths", async () => {
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract])}
        loadUnifiedAttachments={() => Promise.resolve([attachmentRecord])}
        getUnifiedAttachmentDownloadUrl={() => Promise.reject(new ApiRequestError(404, "ATTACHMENT_NOT_FOUND", []))}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
      />,
    );

    await screen.findByText("HT20260511001");
    fireEvent.click(screen.getByRole("cell", { name: "HT20260511001" }));
    fireEvent.click(await screen.findByRole("button", { name: "下载/打开 DEMO 合同附件" }));

    expect(await screen.findByText("附件不存在或不在当前权限范围内。")).toBeInTheDocument();
    expect(screen.queryByText(/\/volume1|Users\/|attachments\/real/i)).not.toBeInTheDocument();
  });

  it("shows missing attachment content errors without exposing paths", async () => {
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract])}
        loadUnifiedAttachments={() => Promise.resolve([attachmentRecord])}
        getUnifiedAttachmentDownloadUrl={() => Promise.reject(new ApiRequestError(404, "ATTACHMENT_CONTENT_NOT_FOUND", []))}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
      />,
    );

    await screen.findByText("HT20260511001");
    fireEvent.click(screen.getByRole("cell", { name: "HT20260511001" }));
    fireEvent.click(await screen.findByRole("button", { name: "下载/打开 DEMO 合同附件" }));

    expect(await screen.findByText("附件内容不存在，请联系管理员重新登记。")).toBeInTheDocument();
    expect(screen.queryByText(/\/volume1|Users\/|attachments\/real/i)).not.toBeInTheDocument();
  });

  it("renders contract empty and error states", async () => {
    const { rerender } = render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([])}
        loadBusinessProjects={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无合同资料")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新增合同" }));
    expect(await screen.findByText("缺少往来方资料，暂不能新增合同。")).toBeInTheDocument();

    rerender(
      <ContractsWorkspace
        loadContracts={() => Promise.reject(new Error("offline"))}
        loadParties={() => Promise.reject(new Error("offline"))}
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadBusinessProjects={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("合同台账加载失败")).toBeInTheDocument();
    expect(await screen.findByText("往来方、业务项目或项目点接口暂不可用，暂不能新增合同。")).toBeInTheDocument();
  });

  it("creates contract records without reopening legacy attachment registration", async () => {
    const createdContract = { ...contract, id: "18181818-1818-4181-8181-181818181818", contractNo: "HT20260511002", contractName: "采购框架合同" };
    const createContract = vi.fn((input) =>
      Promise.resolve({
        ...createdContract,
        contractForm: input.contractForm,
        subjectCategory: input.subjectCategory,
        investmentCategory: input.investmentCategory ?? null,
        businessProjectId: input.businessProjectId ?? null,
        businessProjectName: input.businessProjectId ? businessProject.projectName : null,
      }),
    );

    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        createContract={createContract}
      />,
    );

    await screen.findByText("暂无合同资料");
    expect(screen.queryByRole("button", { name: "保存合同" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新增合同" }));
    expect(screen.queryByText("主附件引用（历史兼容）")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("合同编号"), { target: { value: "HT20260511002" } });
    fireEvent.change(screen.getByLabelText("合同名称"), { target: { value: "采购框架合同" } });
    fireEvent.change(screen.getByLabelText("相对方"), { target: { value: party.id } });
    fireEvent.change(screen.getByLabelText("合同方向"), { target: { value: "purchase_contract" } });
    fireEvent.change(screen.getByLabelText("合同形态"), { target: { value: "framework" } });
    fireEvent.change(screen.getByLabelText("合同标的"), { target: { value: "food_ingredients" } });
    fireEvent.change(screen.getByLabelText("投入分类"), { target: { value: "equipment" } });
    fireEvent.change(screen.getByLabelText("业务项目"), { target: { value: businessProject.id } });
    const projectSiteAssignmentSelect = screen
      .getAllByLabelText("项目点")
      .find((element) => element.tagName === "SELECT");
    expect(projectSiteAssignmentSelect).toBeDefined();
    fireEvent.change(projectSiteAssignmentSelect!, { target: { value: projectSite.id } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2027-05-10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存合同" }));

    await waitFor(() => expect(createContract).toHaveBeenCalled());
    expect(Object.prototype.hasOwnProperty.call(createContract.mock.calls[0][0], "attachmentRef")).toBe(false);
    expect(await screen.findByText("HT20260511002")).toBeInTheDocument();
    expect(screen.getAllByText("框架合同").length).toBeGreaterThan(0);
    expect(screen.getAllByText("食材").length).toBeGreaterThan(0);
    expect(screen.getAllByText("设备").length).toBeGreaterThan(0);
    expect(screen.getByText("扬中中央厨房")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("cell", { name: "HT20260511002" }));
    expect(screen.getByRole("heading", { name: "合同详情" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "登记附件路径" })).not.toBeInTheDocument();
  });

  it("shows contract creation failures without exposing legacy attachment registration", async () => {
    render(
      <ContractsWorkspace
        loadContracts={() => Promise.resolve([contract])}
        loadParties={() => Promise.resolve([party])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        createContract={() => Promise.reject(new Error("duplicate contract"))}
      />,
    );

    await screen.findByText("HT20260511001");
    fireEvent.click(screen.getByRole("button", { name: "新增合同" }));
    fireEvent.change(screen.getByLabelText("合同编号"), { target: { value: "HT20260511002" } });
    fireEvent.change(screen.getByLabelText("合同名称"), { target: { value: "采购框架合同" } });
    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2027-05-10" } });
    fireEvent.click(screen.getByRole("button", { name: "保存合同" }));
    expect(await screen.findByText("合同保存失败，请检查编号、日期或金额。")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "登记附件路径" })).not.toBeInTheDocument();
  });

  it("renders and creates business projects with investment summary", async () => {
    const createdBusinessProject = {
      ...businessProject,
      id: "88888888-8888-4888-8888-888888888888",
      projectCode: "BP-YZ-CK-002",
      projectName: "扬中中央厨房二期",
      status: "preparing" as const,
    };

    render(
      <BusinessProjectsWorkspace
        loadBusinessProjects={() => Promise.resolve([businessProject])}
        loadEmployees={() => Promise.resolve([employee])}
        loadInvestmentSummary={() => Promise.resolve(businessProjectSummary)}
        createBusinessProject={() => Promise.resolve(createdBusinessProject)}
      />,
    );

    expect(screen.getByRole("heading", { name: "业务项目" })).toBeInTheDocument();
    expect((await screen.findAllByText("扬中中央厨房")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("CNY 1,680,000")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("装修/改造").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("项目编码"), { target: { value: "BP-YZ-CK-002" } });
    fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "扬中中央厨房二期" } });
    fireEvent.change(screen.getByLabelText("地点"), { target: { value: "扬中" } });
    fireEvent.click(screen.getByRole("button", { name: "保存业务项目" }));

    expect((await screen.findAllByText("扬中中央厨房二期")).length).toBeGreaterThan(0);
  });

  it("renders certificate risk ledger and read-only states", async () => {
    render(
      <CertificatesWorkspace
        canManage={false}
        loadCertificates={() => Promise.resolve([certificate, expiredCertificate])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "证照资质" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "保存证照" })).not.toBeInTheDocument();
    expect(await screen.findByText("CERT0001")).toBeInTheDocument();
    expect(screen.getByText("证照风险台账")).toBeInTheDocument();
    expect(screen.getByText("人员匹配")).toBeInTheDocument();
    expect(screen.getByText("审核状态")).toBeInTheDocument();
    expect(screen.getByText("项目点食品经营许可证")).toBeInTheDocument();
    expect(screen.getAllByText("即将到期").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已过期").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("CERT0001"));
    expect(screen.queryByText("附件引用")).not.toBeInTheDocument();
    expect(screen.getByText("历史路径/兼容字段")).toBeInTheDocument();
    expect(screen.getAllByText("certificates/test-CERT0001.pdf").length).toBeGreaterThan(0);
  });

  it("shows unified business attachment references in certificate details", async () => {
    render(
      <CertificatesWorkspace
        canManage={false}
        loadCertificates={() => Promise.resolve([certificate])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        loadUnifiedAttachments={() =>
          Promise.resolve([
            {
              ...attachmentRecord,
              ownerModule: "certificates",
              ownerEntityType: "certificate",
              ownerEntityId: certificate.id,
            },
          ])
        }
      />,
    );

    expect(await screen.findByText("CERT0001")).toBeInTheDocument();
    fireEvent.click(screen.getByText("CERT0001"));

    expect(await screen.findByText("统一附件")).toBeInTheDocument();
    expect(await screen.findByText("DEMO 合同附件")).toBeInTheDocument();
    expect(screen.getByText("历史路径/兼容字段")).toBeInTheDocument();
    expect(screen.getAllByText("certificates/test-CERT0001.pdf").length).toBeGreaterThan(0);
  });

  it("renders certificate empty and error states", async () => {
    const { rerender } = render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([])}
        loadParties={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无证照资料")).toBeInTheDocument();

    rerender(
      <CertificatesWorkspace
        loadCertificates={() => Promise.reject(new Error("offline"))}
        loadEmployees={() => Promise.reject(new Error("offline"))}
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadParties={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("证照台账加载失败")).toBeInTheDocument();
  });

  it("creates certificate records and shows create failures", async () => {
    const createdCertificate = {
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
    const createCertificate = vi.fn().mockResolvedValue(createdCertificate);

    const { rerender } = render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        createCertificate={createCertificate}
      />,
    );

    await screen.findByText("暂无证照资料");
    expect(screen.queryByText("附件引用（历史兼容）")).not.toBeInTheDocument();
    expect(screen.queryByText("来源文件引用（历史兼容）")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("证照编码"), { target: { value: "CERT0003" } });
    fireEvent.change(screen.getByLabelText("证照名称"), { target: { value: "供应商营业执照" } });
    fireEvent.change(screen.getByLabelText("证照类型"), { target: { value: "business_license" } });
    fireEvent.change(screen.getByLabelText("归属对象"), { target: { value: "supplier" } });
    fireEvent.change(screen.getByLabelText("往来方"), { target: { value: party.id } });
    fireEvent.change(screen.getByLabelText("有效期类型"), { target: { value: "long_term" } });
    fireEvent.change(screen.getByLabelText("下次复核日期"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证照" }));

    await waitFor(() => expect(createCertificate).toHaveBeenCalled());
    expect(Object.prototype.hasOwnProperty.call(createCertificate.mock.calls[0][0], "attachmentPath")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(createCertificate.mock.calls[0][0], "sourceFilePath")).toBe(false);
    expect(await screen.findByText("CERT0003")).toBeInTheDocument();

    rerender(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        createCertificate={() => Promise.reject(new Error("duplicate"))}
      />,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.change(screen.getByLabelText("证照编码"), { target: { value: "CERT0004" } });
    fireEvent.change(screen.getByLabelText("证照名称"), { target: { value: "错误证照" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证照" }));

    expect(await screen.findByText("证照保存失败，请检查编码、归属对象或日期。")).toBeInTheDocument();
  });

  it("creates a health certificate for a project-site roster person", async () => {
    const createCertificate = vi.fn().mockResolvedValue({
      ...expiredCertificate,
      id: "54545454-5454-4454-8454-545454545454",
      certificateCode: "CERT0005",
      ownerEmployeeId: null,
      ownerEmployeeName: null,
      ownerRosterPersonId: rosterPerson.id,
      ownerRosterPersonName: rosterPerson.personName,
      ownerRosterPersonProjectSiteId: rosterPerson.projectSiteId,
      ownerNameSnapshot: rosterPerson.personName,
    });

    render(
      <CertificatesWorkspace
        loadCertificates={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([employee])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadParties={() => Promise.resolve([party])}
        loadRosterPeople={() => Promise.resolve([rosterPerson])}
        createCertificate={createCertificate}
      />,
    );

    await screen.findByText("暂无证照资料");
    fireEvent.change(screen.getByLabelText("证照编码"), { target: { value: "CERT0005" } });
    fireEvent.change(screen.getByLabelText("证照名称"), { target: { value: "李现场健康证" } });
    fireEvent.change(screen.getByLabelText("证照类型"), { target: { value: "person_health_cert" } });
    fireEvent.change(screen.getByLabelText("归属对象"), { target: { value: "person" } });
    fireEvent.change(screen.getByLabelText("人员来源"), { target: { value: "roster" } });
    fireEvent.change(screen.getByLabelText("项目点现场人员"), { target: { value: rosterPerson.id } });
    fireEvent.change(screen.getByLabelText("到期日期"), { target: { value: "2026-06-30" } });
    fireEvent.click(screen.getByRole("button", { name: "保存证照" }));

    expect(createCertificate).toHaveBeenCalledWith(expect.objectContaining({
      ownerType: "person",
      ownerEmployeeId: null,
      ownerRosterPersonId: rosterPerson.id,
      ownerNameSnapshot: rosterPerson.personName,
    }));
    expect(await screen.findByText("CERT0005")).toBeInTheDocument();
  });

  it("previews and confirms Excel import jobs", async () => {
    const confirmedJob: ImportJobDto = {
      ...importJob,
      status: "confirmed",
      importedRows: 1,
      confirmedAt: "2026-05-11T12:30:00.000Z",
      rows: importJob.rows.map((row) => (row.status === "valid" ? { ...row, status: "imported" as const } : row)),
    };

    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        previewImportJob={() => Promise.resolve(importJob)}
        confirmImportJob={() => Promise.resolve(confirmedJob)}
      />,
    );

    expect((await screen.findAllByText("暂无导入批次")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Excel 文件"), {
      target: {
        files: [new File(["xlsx"], "suppliers.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入预检" }));

    expect(await screen.findByText("suppliers.xlsx")).toBeInTheDocument();
    expect(screen.getByText("编码已存在，确认导入时会跳过")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认导入" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));

    expect(await screen.findByText("已确认导入")).toBeInTheDocument();
    expect(screen.getAllByText("已导入").length).toBeGreaterThan(0);
  });

  it("shows Excel import loading, error, empty, and read-only states", async () => {
    const { rerender } = render(
      <ExcelImportWorkspace
        canManage={false}
        loadImportJobs={() => Promise.resolve([importJobSummary])}
        loadImportJobDetail={() => Promise.resolve(importJob)}
      />,
    );

    expect(await screen.findByText("suppliers.xlsx")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导入预检" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    expect(await screen.findByText("编码已存在，确认导入时会跳过")).toBeInTheDocument();

    rerender(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        previewImportJob={() => Promise.reject(new Error("invalid template"))}
      />,
    );
    expect((await screen.findAllByText("暂无导入批次")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Excel 文件"), {
      target: {
        files: [new File(["bad"], "bad.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入预检" }));
    expect(await screen.findByText("Excel 导入操作失败")).toBeInTheDocument();

    rerender(<ExcelImportWorkspace loadImportJobs={() => Promise.reject(new Error("offline"))} />);
    expect(await screen.findByText("导入批次加载失败")).toBeInTheDocument();
  });

  it("renders purchase empty and error states", async () => {
    const { rerender } = render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无采购需求")).toBeInTheDocument();
    expect(await screen.findByText("暂无采购记录")).toBeInTheDocument();

    rerender(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.reject(new Error("offline"))}
        loadPurchaseRecords={() => Promise.reject(new Error("offline"))}
        loadContracts={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("采购需求加载失败")).toBeInTheDocument();
    expect(await screen.findByText("采购记录加载失败")).toBeInTheDocument();
  });

  it("creates purchase request and purchase record records from the forms", async () => {
    const createdRequest = { ...purchaseRequest, requestNo: "PR20260511002", lines: [{ ...purchaseRequest.lines[0], materialName: "定制纸杯" }] };
    const createdRecord = { ...purchaseRecord, purchaseNo: "PO20260511002", sourceType: "offline" as const, purchasePlatform: null, shopName: null, purchaseDescription: "线下门店临时采购" };

    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([contract])}
        createPurchaseRequest={() => Promise.resolve(createdRequest)}
        createPurchaseRecord={() => Promise.resolve(createdRecord)}
      />,
    );

    await screen.findByText("暂无采购需求");
    expect(screen.queryByRole("button", { name: "保存采购需求" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新增采购需求" }));
    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR20260511002" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "项目运营部" } });
    fireEvent.change(screen.getByLabelText("需求物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    fireEvent.click(screen.getByRole("button", { name: "新增采购记录" }));
    fireEvent.change(screen.getByLabelText("采购单号"), { target: { value: "PO20260511002" } });
    fireEvent.change(screen.getByLabelText("采购人"), { target: { value: "赵六" } });
    fireEvent.change(screen.getByLabelText("采购来源"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("采购说明"), { target: { value: "线下门店临时采购" } });
    fireEvent.change(screen.getByLabelText("关联合同"), { target: { value: contract.id } });
    fireEvent.change(screen.getByLabelText("采购日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("采购物料名称"), { target: { value: "办公复印纸" } });
    fireEvent.change(screen.getByLabelText("采购数量"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("采购单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购记录" }));

    expect(await screen.findByText("PR20260511002")).toBeInTheDocument();
    expect(await screen.findByText("PO20260511002")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("cell", { name: "PR20260511002" }));
    expect(screen.getByRole("heading", { name: "采购需求详情" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("cell", { name: "PO20260511002" }));
    expect(screen.getByRole("heading", { name: "采购记录详情" })).toBeInTheDocument();
  });

  it("submits, approves, and rejects purchase requests from the approval panel", async () => {
    const draftRequest = { ...purchaseRequest, id: "request-draft", requestNo: "PR-DRAFT", status: "draft" as const };
    const pendingRequest = {
      ...purchaseRequest,
      id: "request-pending",
      requestNo: "PR-PENDING",
      status: "pending_approval" as const,
      submittedAt: "2026-05-11T12:00:00.000Z",
    };
    const pendingRejectRequest = {
      ...purchaseRequest,
      id: "request-pending-reject",
      requestNo: "PR-REJECT",
      status: "pending_approval" as const,
      submittedAt: "2026-05-11T12:05:00.000Z",
    };
    const submittedRequest = { ...draftRequest, status: "pending_approval" as const, submittedAt: "2026-05-11T12:30:00.000Z" };
    const approvedRequest = {
      ...pendingRequest,
      status: "pending_purchase" as const,
      reviewedAt: "2026-05-11T13:00:00.000Z",
      reviewedByName: "采购主管",
      reviewRemark: "同意采购",
    };
    const rejectedRequest = {
      ...pendingRejectRequest,
      status: "rejected" as const,
      reviewedAt: "2026-05-11T13:10:00.000Z",
      reviewedByName: "采购主管",
      reviewRemark: "资料不完整",
    };
    const submitPurchaseRequest = vi.fn(() => Promise.resolve(submittedRequest));
    const approvePurchaseRequest = vi.fn(() => Promise.resolve(approvedRequest));
    const rejectPurchaseRequest = vi.fn(() => Promise.resolve(rejectedRequest));

    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([draftRequest, pendingRequest, pendingRejectRequest])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
        submitPurchaseRequest={submitPurchaseRequest}
        approvePurchaseRequest={approvePurchaseRequest}
        rejectPurchaseRequest={rejectPurchaseRequest}
      />,
    );

    expect(await screen.findByRole("heading", { name: "待审批" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "提交 PR-DRAFT" }));
    expect(await screen.findByText("PR-DRAFT")).toBeInTheDocument();
    expect(submitPurchaseRequest).toHaveBeenCalledWith("request-draft");

    fireEvent.change(screen.getByLabelText("审批备注"), { target: { value: "同意采购" } });
    fireEvent.click(screen.getByRole("button", { name: "审批通过 PR-PENDING" }));
    expect(approvePurchaseRequest).not.toHaveBeenCalled();
    expect(screen.getByText("确认审批通过 PR-PENDING？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确认审批通过 PR-PENDING？")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "审批通过 PR-PENDING" }));
    fireEvent.click(screen.getByRole("button", { name: "确认审批通过" }));
    expect(await screen.findByText((content) => content.includes("同意采购"))).toBeInTheDocument();
    expect(approvePurchaseRequest).toHaveBeenCalledWith("request-pending", { reviewedByName: "", reviewRemark: "同意采购" });

    fireEvent.change(screen.getByLabelText("审批备注"), { target: { value: "资料不完整" } });
    fireEvent.click(screen.getByRole("button", { name: "驳回 PR-REJECT" }));
    expect(rejectPurchaseRequest).not.toHaveBeenCalled();
    expect(screen.getByText("确认驳回 PR-REJECT？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认驳回" }));
    expect(await screen.findByText("已驳回")).toBeInTheDocument();
    expect(rejectPurchaseRequest).toHaveBeenCalledWith("request-pending-reject", { reviewedByName: "", reviewRemark: "资料不完整" });
  });

  it("hides purchase approval actions from read-only users and shows review failures", async () => {
    const pendingRequest = { ...purchaseRequest, status: "pending_approval" as const };
    const { rerender } = render(
      <PurchaseWorkspace
        canManage={false}
        loadPurchaseRequests={() => Promise.resolve([pendingRequest])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByRole("heading", { name: "待审批" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /审批通过/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /驳回/ })).not.toBeInTheDocument();

    rerender(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([pendingRequest])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
        approvePurchaseRequest={() => Promise.reject(new Error("approval failed"))}
      />,
    );

    expect(await screen.findByRole("button", { name: "审批通过 PR20260511001" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "审批通过 PR20260511001" }));
    fireEvent.click(screen.getByRole("button", { name: "确认审批通过" }));
    expect(await screen.findByText("审批操作失败")).toBeInTheDocument();
  });

  it("shows purchase creation failures", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        loadContracts={() => Promise.resolve([])}
        createPurchaseRequest={() => Promise.reject(new ApiRequestError(400, "PURCHASE_REQUEST_VALIDATION_FAILED", ["采购需求编号已存在"]))}
        createPurchaseRecord={() => Promise.reject(new ApiRequestError(400, "PURCHASE_RECORD_VALIDATION_FAILED", ["采购单号已存在"]))}
      />,
    );

    await screen.findByText("暂无采购需求");
    fireEvent.click(screen.getByRole("button", { name: "新增采购需求" }));
    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR20260511002" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "项目运营部" } });
    fireEvent.change(screen.getByLabelText("需求物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));
    expect(await screen.findByText("采购需求编号已存在")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增采购记录" }));
    fireEvent.change(screen.getByLabelText("采购单号"), { target: { value: "PO20260511002" } });
    fireEvent.change(screen.getByLabelText("采购人"), { target: { value: "赵六" } });
    fireEvent.change(screen.getByLabelText("采购来源"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("采购说明"), { target: { value: "线下门店临时采购" } });
    fireEvent.change(screen.getByLabelText("采购日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("采购物料名称"), { target: { value: "办公复印纸" } });
    fireEvent.change(screen.getByLabelText("采购数量"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("采购单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购记录" }));

    expect(await screen.findByText("采购单号已存在")).toBeInTheDocument();
  });

  it("renders people permissions empty and error states", async () => {
    const { rerender } = render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([])}
        loadUserAccounts={() => Promise.resolve([])}
        loadExternalProjectSiteAccounts={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([])}
        loadProjectSiteAssignments={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无部门资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无员工资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无账号资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无项目点账号")).toBeInTheDocument();
    expect(await screen.findByText("暂无项目点分配")).toBeInTheDocument();

    rerender(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.reject(new Error("offline"))}
        loadEmployees={() => Promise.reject(new Error("offline"))}
        loadUserAccounts={() => Promise.reject(new Error("offline"))}
        loadExternalProjectSiteAccounts={() => Promise.reject(new Error("offline"))}
        loadProjectSites={() => Promise.reject(new Error("offline"))}
        loadProjectSiteAssignments={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("部门资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("员工资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("账号资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("项目点账号加载失败")).toBeInTheDocument();
    expect(await screen.findByText("项目点分配加载失败")).toBeInTheDocument();
  });

  it("creates department, employee, and user account records from the forms", async () => {
    const createdDepartment = { ...department, departmentCode: "DEP-WH", name: "仓储部" };
    const createdEmployee = { ...employee, employeeNo: "EMP0002", name: "李四", username: null, accountStatus: null };
    const createdAccount = { ...userAccount, username: "lisi", employeeNo: "EMP0002", employeeName: "李四", roles: ["viewer"] as const };
    const createdExternalAccount = {
      ...externalProjectSiteAccount,
      id: "58585858-5858-4858-8858-585858585858",
      username: "site-new",
      currentContactName: "赵项目",
      currentContactPhone: "13811112222",
    };
    const createdAssignment = { ...projectSiteAssignment, id: "24242424-2424-4242-8242-242424242424" };

    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([])}
        loadExternalProjectSiteAccounts={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([])}
        createDepartment={() => Promise.resolve(createdDepartment)}
        createEmployee={() => Promise.resolve(createdEmployee)}
        createUserAccount={() => Promise.resolve(createdAccount)}
        createExternalProjectSiteAccount={() => Promise.resolve(createdExternalAccount)}
        createProjectSiteAssignment={() => Promise.resolve(createdAssignment)}
      />,
    );

    await screen.findByText("EMP0001");
    fireEvent.change(screen.getByLabelText("部门编码"), { target: { value: "DEP-WH" } });
    fireEvent.change(screen.getByLabelText("部门名称"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "保存部门" }));

    fireEvent.change(screen.getByLabelText("员工编号"), { target: { value: "EMP0002" } });
    fireEvent.change(screen.getByLabelText("员工姓名"), { target: { value: "李四" } });
    fireEvent.click(screen.getByRole("button", { name: "保存员工" }));

    fireEvent.change(screen.getByLabelText("登录账号"), { target: { value: "lisi" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存账号" }));

    fireEvent.change(screen.getByLabelText("当前联系人"), { target: { value: "赵项目" } });
    fireEvent.change(screen.getByLabelText("手机号"), { target: { value: "13811112222" } });
    fireEvent.change(screen.getByLabelText("项目点登录账号"), { target: { value: "site-new" } });
    fireEvent.change(screen.getByLabelText("项目点初始密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存项目点账号" }));

    fireEvent.change(screen.getByLabelText("员工"), { target: { value: employee.id } });
    const projectSiteAssignmentSelect = screen
      .getAllByLabelText("项目点")
      .find((element) => element.tagName === "SELECT");
    expect(projectSiteAssignmentSelect).toBeDefined();
    fireEvent.change(projectSiteAssignmentSelect!, { target: { value: projectSite.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存分配" }));

    expect(await screen.findAllByText("仓储部")).not.toHaveLength(0);
    expect(await screen.findByText("EMP0002")).toBeInTheDocument();
    expect(await screen.findByText("lisi")).toBeInTheDocument();
    expect(await screen.findByText("赵项目")).toBeInTheDocument();
    expect(await screen.findAllByText("SITE-WX-001 科技园一期项目点")).not.toHaveLength(0);
  });

  it("shows people permissions creation failures", async () => {
    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([])}
        loadExternalProjectSiteAccounts={() => Promise.resolve([])}
        loadProjectSites={() => Promise.resolve([projectSite])}
        loadProjectSiteAssignments={() => Promise.resolve([])}
        createDepartment={() => Promise.reject(new ApiRequestError(400, "DEPARTMENT_VALIDATION_FAILED", ["部门编码已存在"]))}
        createEmployee={() => Promise.reject(new ApiRequestError(400, "EMPLOYEE_VALIDATION_FAILED", ["员工编号已存在"]))}
        createUserAccount={() => Promise.reject(new ApiRequestError(400, "USER_ACCOUNT_VALIDATION_FAILED", ["登录账号已存在"]))}
        createProjectSiteAssignment={() => Promise.reject(new ApiRequestError(400, "ASSIGNMENT_VALIDATION_FAILED", ["该员工已分配到该项目点"]))}
      />,
    );

    await screen.findByText("EMP0001");
    fireEvent.change(screen.getByLabelText("部门编码"), { target: { value: "DEP-WH" } });
    fireEvent.change(screen.getByLabelText("部门名称"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "保存部门" }));

    fireEvent.change(screen.getByLabelText("员工编号"), { target: { value: "EMP0002" } });
    fireEvent.change(screen.getByLabelText("员工姓名"), { target: { value: "李四" } });
    fireEvent.click(screen.getByRole("button", { name: "保存员工" }));

    fireEvent.change(screen.getByLabelText("登录账号"), { target: { value: "lisi" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "ChangeMe123!" } });
    fireEvent.click(screen.getByRole("button", { name: "保存账号" }));
    fireEvent.change(screen.getByLabelText("员工"), { target: { value: employee.id } });
    const projectSiteAssignmentSelect = screen
      .getAllByLabelText("项目点")
      .find((element) => element.tagName === "SELECT");
    expect(projectSiteAssignmentSelect).toBeDefined();
    fireEvent.change(projectSiteAssignmentSelect!, { target: { value: projectSite.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存分配" }));

    expect(await screen.findByText("部门编码已存在")).toBeInTheDocument();
    expect(await screen.findByText("员工编号已存在")).toBeInTheDocument();
    expect(await screen.findByText("登录账号已存在")).toBeInTheDocument();
    expect(await screen.findByText("该员工已分配到该项目点")).toBeInTheDocument();
  });
});
