import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { ApiStatus } from "../src/components/ApiStatus";
import { InventoryWorkspace } from "../src/components/InventoryWorkspace";
import { MaterialsWarehousesWorkspace } from "../src/components/MaterialsWarehousesWorkspace";
import { PartiesWorkspace } from "../src/components/PartiesWorkspace";
import { PeoplePermissionsWorkspace } from "../src/components/PeoplePermissionsWorkspace";
import { PurchaseWorkspace } from "../src/components/PurchaseWorkspace";
import { ReplenishmentSuggestionsWorkspace } from "../src/components/ReplenishmentSuggestionsWorkspace";
import type {
  DepartmentDto,
  EmployeeDto,
  GenerateReplenishmentSuggestionsResult,
  InventoryBalanceDto,
  InventoryMovementDto,
  MaterialDto,
  PartyDto,
  PurchaseRecordDto,
  PurchaseRequestDto,
  ReplenishmentSuggestionDto,
  UserAccountDto,
  WarehouseDto,
} from "@company-erp/shared";

const party: PartyDto = {
  id: "11111111-1111-4111-8111-111111111111",
  partyCode: "SUP0001",
  partyName: "晨光贸易有限公司",
  partyTypes: ["supplier"],
  unifiedSocialCreditCode: "91320200MA00000001",
  primaryContactName: "张三",
  primaryContactPhone: "13800000000",
  supplyCategory: "办公物料",
  commonMaterials: "复印纸、工服",
  address: "无锡市",
  settlementNotes: "月结",
  status: "enabled",
  remark: "常用供应商",
  createdAt: "2026-05-11T08:00:00.000Z",
  updatedAt: "2026-05-11T08:00:00.000Z",
};

const warehouse: WarehouseDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  warehouseCode: "WH-WX-HQ",
  warehouseName: "无锡总部仓库",
  warehouseType: "headquarters",
  projectSiteId: null,
  managerName: "王仓管",
  managerPhone: "13900000000",
  status: "enabled",
  remark: "MVP 唯一真实库存仓库",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const material: MaterialDto = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  materialCode: "MAT0001",
  materialName: "定制员工工服",
  specification: "夏装 L 码",
  materialCategory: "定制物料",
  baseUnit: "套",
  defaultWarehouseId: warehouse.id,
  defaultWarehouseName: warehouse.warehouseName,
  defaultSupplierPartyId: party.id,
  defaultSupplierPartyName: party.partyName,
  safeStock: 20,
  status: "enabled",
  remark: "按季度补货",
  createdAt: "2026-05-11T09:00:00.000Z",
  updatedAt: "2026-05-11T09:00:00.000Z",
};

const department: DepartmentDto = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  departmentCode: "DEP-HR",
  name: "人事行政部",
  parentId: null,
  parentName: null,
  managerEmployeeId: null,
  managerEmployeeName: null,
  status: "enabled",
  sortOrder: 10,
  remark: "人员台账维护",
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

const employee: EmployeeDto = {
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  employeeNo: "EMP0001",
  name: "张三",
  gender: "男",
  phone: "13800000000",
  email: "zhangsan@example.com",
  departmentId: department.id,
  departmentName: department.name,
  position: "人事专员",
  employmentStatus: "active",
  hireDate: "2026-05-01",
  leaveDate: null,
  remark: "MVP 员工样例",
  userAccountId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  username: "zhangsan",
  accountStatus: "active",
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

const userAccount: UserAccountDto = {
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  employeeId: employee.id,
  employeeNo: employee.employeeNo,
  employeeName: employee.name,
  username: "zhangsan",
  status: "active",
  roles: ["hr", "viewer"],
  lastLoginAt: null,
  passwordChangedAt: "2026-05-11T10:00:00.000Z",
  createdAt: "2026-05-11T10:00:00.000Z",
  updatedAt: "2026-05-11T10:00:00.000Z",
};

const purchaseRequest: PurchaseRequestDto = {
  id: "11111111-1111-4111-8111-111111111111",
  requestNo: "PR20260511001",
  requesterName: "张三",
  requesterEmployeeId: null,
  departmentName: "项目运营部",
  departmentId: null,
  projectSiteId: null,
  projectSiteName: null,
  expectedArrivalDate: "2026-05-20",
  purpose: "项目点补充工服",
  status: "draft",
  remark: null,
  lines: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      materialId: null,
      materialCode: "MAT0001",
      materialName: "定制员工工服",
      specification: "夏装 L 码",
      requestedQuantity: 20,
      unit: "套",
      remark: null,
    },
  ],
  createdAt: "2026-05-11T11:00:00.000Z",
  updatedAt: "2026-05-11T11:00:00.000Z",
};

const replenishmentSuggestion: ReplenishmentSuggestionDto = {
  id: "99999999-9999-4999-8999-999999999999",
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  unit: material.baseUnit,
  safeStock: 50,
  currentStock: 18,
  reservedUsageQty: 12,
  openPurchaseQty: 20,
  suggestedQuantity: 24,
  status: "open",
  convertedPurchaseRequestId: null,
  convertedPurchaseRequestNo: null,
  remark: "系统根据安全库存生成",
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:00:00.000Z",
};

const purchaseRecord: PurchaseRecordDto = {
  id: "33333333-3333-4333-8333-333333333333",
  purchaseNo: "PO20260511001",
  purchaseRequestId: purchaseRequest.id,
  purchaseRequestNo: purchaseRequest.requestNo,
  purchaserName: "李四",
  purchaserEmployeeId: null,
  sourceType: "platform",
  purchasePlatform: "京东企业购",
  platformOrderNo: "JD20260511001",
  shopName: "京东自营",
  supplierPartyId: null,
  supplierPartyName: null,
  supplierNameText: null,
  purchaseDescription: null,
  purchaseDate: "2026-05-11",
  expectedArrivalDate: "2026-05-18",
  receivedQuantity: 0,
  status: "ordered",
  remark: null,
  lines: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      purchaseRequestLineId: purchaseRequest.lines[0].id,
      materialId: null,
      materialCode: "MAT0001",
      materialName: "定制员工工服",
      specification: "夏装 L 码",
      purchaseQuantity: 20,
      unit: "套",
      purchasePrice: 98,
      receivedQuantity: 0,
      remark: null,
    },
  ],
  createdAt: "2026-05-11T11:00:00.000Z",
  updatedAt: "2026-05-11T11:00:00.000Z",
};

const inventoryMovement: InventoryMovementDto = {
  id: "99999999-9999-4999-8999-999999999999",
  movementNo: "RK20260511001",
  movementDate: "2026-05-11",
  movementType: "inbound",
  sourceType: "purchase",
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  quantity: 12,
  unit: material.baseUnit,
  unitPrice: 98,
  purchaseRecordNo: purchaseRecord.purchaseNo,
  purchaseRecordLineId: purchaseRecord.lines[0].id,
  handledBy: "王仓管",
  purpose: "采购入库",
  remark: null,
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:00:00.000Z",
};

const inventoryBalance: InventoryBalanceDto = {
  warehouseId: warehouse.id,
  warehouseCode: warehouse.warehouseCode,
  warehouseName: warehouse.warehouseName,
  materialId: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  currentQuantity: 12,
  unit: material.baseUnit,
  safeStock: material.safeStock,
  isLowStock: true,
  lastMovementAt: "2026-05-11",
};

describe("Company ERP app shell", () => {
  it("renders the Apple-style dashboard navigation and top bar", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Company ERP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByPlaceholderText("搜索菜单、功能、物料、供应商、单据号...")).toBeInTheDocument();
    expect(screen.getByText("数据库已连接")).toBeInTheDocument();
    expect(screen.getByText("系统管理员")).toBeInTheDocument();

    for (const label of ["基础资料", "采购", "库存", "合同", "项目点", "人员权限", "Excel 导入", "系统设置"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
  });

  it("renders the dashboard workflow, metrics, and operational panels", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "工作台" })).toBeInTheDocument();
    for (const step of ["采购需求", "待审批", "采购执行", "入库", "库存", "项目点领用"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }

    for (const title of ["待审批", "采购需求", "入库记录", "低库存物料", "项目点领用"]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }

    for (const panel of ["最近采购记录", "最近入库记录", "项目点领用汇总（本月）", "系统状态"]) {
      expect(screen.getByText(panel)).toBeInTheDocument();
    }

    expect(screen.getByText("PO20240511012")).toBeInTheDocument();
    expect(screen.getAllByText("采购人：李四").length).toBeGreaterThan(0);
    expect(screen.getByText("京东企业购")).toBeInTheDocument();
    expect(screen.getAllByText("未建供应商").length).toBeGreaterThan(0);
    expect(screen.getByText("RK20240511005")).toBeInTheDocument();
    expect(screen.getByText("6分镀锌管（4米/根）")).toBeInTheDocument();
    expect(screen.getAllByText("科技园一期项目部").length).toBeGreaterThan(0);
  });

  it("renders the lightweight inventory MVP workspace", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "库存管理" })).toBeInTheDocument();
    expect(screen.getByText("采购记录 -> 仓库入库 -> 库存流水 -> 当前库存余额")).toBeInTheDocument();

    for (const tab of ["入库登记", "库存流水", "当前库存查询"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "出库登记 后续开放" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "项目点领用记录 后续开放" })).toBeDisabled();
    expect(screen.getByText("当前库存 = 库存流水数量按仓库 + 物料汇总")).toBeInTheDocument();
  });

  it("shows API health success state", async () => {
    render(<ApiStatus loadHealth={() => Promise.resolve({ status: "ok", service: "company-erp-api" })} />);

    await waitFor(() => {
      expect(screen.getByText("API online")).toBeInTheDocument();
    });
  });

  it("shows API health failure state", async () => {
    render(<ApiStatus loadHealth={() => Promise.reject(new Error("offline"))} />);

    await waitFor(() => {
      expect(screen.getByText("API offline")).toBeInTheDocument();
    });
  });

  it("renders populated counterparty master data", async () => {
    render(<PartiesWorkspace loadParties={() => Promise.resolve([party])} />);

    expect(screen.getByText("往来方基础")).toBeInTheDocument();
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

    expect(screen.getByText("物料基础")).toBeInTheDocument();
    expect(screen.getByText("仓库基础")).toBeInTheDocument();
    expect(await screen.findByText("定制员工工服")).toBeInTheDocument();
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

    render(
      <MaterialsWarehousesWorkspace
        loadMaterials={() => Promise.resolve([])}
        loadWarehouses={() => Promise.resolve([])}
        createMaterial={() => Promise.resolve(createdMaterial)}
        createWarehouse={() => Promise.resolve(createdWarehouse)}
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

    expect(await screen.findByText("定制纸杯")).toBeInTheDocument();
    expect(await screen.findByText("临时周转仓")).toBeInTheDocument();
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
      />,
    );

    expect(screen.getByRole("heading", { name: "人员权限" })).toBeInTheDocument();
    expect(screen.getByText("部门管理")).toBeInTheDocument();
    expect(screen.getByText("员工台账")).toBeInTheDocument();
    expect(screen.getByText("账号角色")).toBeInTheDocument();
    expect(screen.getByText("权限矩阵")).toBeInTheDocument();
    expect(await screen.findAllByText("人事行政部")).not.toHaveLength(0);
    expect(screen.getByText("EMP0001")).toBeInTheDocument();
    expect(screen.getAllByText("zhangsan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HR").length).toBeGreaterThan(0);
  });

  it("renders purchase request and purchase record workspace data", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([{ ...purchaseRequest, purpose: "库存补货建议" }])}
        loadPurchaseRecords={() => Promise.resolve([purchaseRecord])}
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
    expect(await screen.findByText("待确认建议 1 条")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR-REP-20260511001" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王仓管" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "仓储部" } });
    fireEvent.click(screen.getByRole("button", { name: "转采购需求" }));

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
    expect(await screen.findByText("RK20260511001")).toBeInTheDocument();
    expect(screen.getAllByText("WH-WX-HQ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MAT0001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("低库存").length).toBeGreaterThan(0);
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

  it("renders purchase empty and error states", async () => {
    const { rerender } = render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无采购需求")).toBeInTheDocument();
    expect(await screen.findByText("暂无采购记录")).toBeInTheDocument();

    rerender(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.reject(new Error("offline"))}
        loadPurchaseRecords={() => Promise.reject(new Error("offline"))}
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
        createPurchaseRequest={() => Promise.resolve(createdRequest)}
        createPurchaseRecord={() => Promise.resolve(createdRecord)}
      />,
    );

    await screen.findByText("暂无采购需求");
    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR20260511002" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "项目运营部" } });
    fireEvent.change(screen.getByLabelText("需求物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    fireEvent.change(screen.getByLabelText("采购单号"), { target: { value: "PO20260511002" } });
    fireEvent.change(screen.getByLabelText("采购人"), { target: { value: "赵六" } });
    fireEvent.change(screen.getByLabelText("采购来源"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("采购说明"), { target: { value: "线下门店临时采购" } });
    fireEvent.change(screen.getByLabelText("采购日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("采购物料名称"), { target: { value: "办公复印纸" } });
    fireEvent.change(screen.getByLabelText("采购数量"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("采购单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购记录" }));

    expect(await screen.findByText("PR20260511002")).toBeInTheDocument();
    expect(await screen.findByText("PO20260511002")).toBeInTheDocument();
  });

  it("shows purchase creation failures", async () => {
    render(
      <PurchaseWorkspace
        loadPurchaseRequests={() => Promise.resolve([])}
        loadPurchaseRecords={() => Promise.resolve([])}
        createPurchaseRequest={() => Promise.reject(new Error("duplicate request"))}
        createPurchaseRecord={() => Promise.reject(new Error("duplicate record"))}
      />,
    );

    await screen.findByText("暂无采购需求");
    fireEvent.change(screen.getByLabelText("采购需求编号"), { target: { value: "PR20260511002" } });
    fireEvent.change(screen.getByLabelText("申请人"), { target: { value: "王五" } });
    fireEvent.change(screen.getByLabelText("申请部门"), { target: { value: "项目运营部" } });
    fireEvent.change(screen.getByLabelText("需求物料名称"), { target: { value: "定制纸杯" } });
    fireEvent.change(screen.getByLabelText("需求数量"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("需求单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购需求" }));

    fireEvent.change(screen.getByLabelText("采购单号"), { target: { value: "PO20260511002" } });
    fireEvent.change(screen.getByLabelText("采购人"), { target: { value: "赵六" } });
    fireEvent.change(screen.getByLabelText("采购来源"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("采购说明"), { target: { value: "线下门店临时采购" } });
    fireEvent.change(screen.getByLabelText("采购日期"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("采购物料名称"), { target: { value: "办公复印纸" } });
    fireEvent.change(screen.getByLabelText("采购数量"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("采购单位"), { target: { value: "箱" } });
    fireEvent.click(screen.getByRole("button", { name: "保存采购记录" }));

    expect(await screen.findAllByText("保存失败，请检查单号是否重复或稍后重试。")).toHaveLength(2);
  });

  it("renders people permissions empty and error states", async () => {
    const { rerender } = render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([])}
        loadEmployees={() => Promise.resolve([])}
        loadUserAccounts={() => Promise.resolve([])}
      />,
    );

    expect(await screen.findByText("暂无部门资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无员工资料")).toBeInTheDocument();
    expect(await screen.findByText("暂无账号资料")).toBeInTheDocument();

    rerender(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.reject(new Error("offline"))}
        loadEmployees={() => Promise.reject(new Error("offline"))}
        loadUserAccounts={() => Promise.reject(new Error("offline"))}
      />,
    );

    expect(await screen.findByText("部门资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("员工资料加载失败")).toBeInTheDocument();
    expect(await screen.findByText("账号资料加载失败")).toBeInTheDocument();
  });

  it("creates department, employee, and user account records from the forms", async () => {
    const createdDepartment = { ...department, departmentCode: "DEP-WH", name: "仓储部" };
    const createdEmployee = { ...employee, employeeNo: "EMP0002", name: "李四", username: null, accountStatus: null };
    const createdAccount = { ...userAccount, username: "lisi", employeeNo: "EMP0002", employeeName: "李四", roles: ["viewer"] as const };

    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([])}
        createDepartment={() => Promise.resolve(createdDepartment)}
        createEmployee={() => Promise.resolve(createdEmployee)}
        createUserAccount={() => Promise.resolve(createdAccount)}
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

    expect(await screen.findAllByText("仓储部")).not.toHaveLength(0);
    expect(await screen.findByText("EMP0002")).toBeInTheDocument();
    expect(await screen.findByText("lisi")).toBeInTheDocument();
  });

  it("shows people permissions creation failures", async () => {
    render(
      <PeoplePermissionsWorkspace
        loadDepartments={() => Promise.resolve([department])}
        loadEmployees={() => Promise.resolve([employee])}
        loadUserAccounts={() => Promise.resolve([])}
        createDepartment={() => Promise.reject(new Error("duplicate department"))}
        createEmployee={() => Promise.reject(new Error("duplicate employee"))}
        createUserAccount={() => Promise.reject(new Error("duplicate account"))}
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

    expect(await screen.findAllByText("保存失败，请检查唯一编码或稍后重试。")).toHaveLength(3);
  });
});
