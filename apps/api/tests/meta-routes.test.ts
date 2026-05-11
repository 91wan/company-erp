import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("metadata API", () => {
  it("returns health without requiring a database connection", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "company-erp-api",
      database: { configured: expect.any(Boolean) },
    });
  });

  it("returns the fixed MVP roles", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/meta/roles" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      roles: [
        { code: "admin", label: "Admin", description: "Full system administration" },
        { code: "hr", label: "HR", description: "Staff, departments, and assignments" },
        { code: "procurement", label: "Procurement", description: "Purchase and contract workflow" },
        { code: "warehouse", label: "Warehouse", description: "Receiving, stock, and outbound records" },
        { code: "project_site", label: "Project Site", description: "Assigned project-site records and usage" },
        { code: "viewer", label: "Viewer", description: "Read-only internal access" },
      ],
    });
  });

  it("returns fixed MVP permission metadata", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/meta/permissions",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      assignmentPolicy: {
        allowMultipleRoles: true,
        effectivePermissionRule: "union",
        adminRoleAssignableBy: ["admin"],
      },
      permissionMatrix: {
        employees: { manage: ["admin", "hr"] },
        userAccounts: { manage: ["admin"] },
        roleAssignment: { manage: ["admin"] },
      },
    });
  });

  it("returns the MVP dictionaries used by import templates", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/meta/dictionaries",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dictionaries: {
        baseStatus: { values: ["启用", "停用"] },
        employeeStatus: { values: ["在职", "离职", "停用"] },
        contractStatus: { values: ["履行中", "已终止"] },
        contractDirection: { values: ["采购合同", "客户服务合同", "外包合同", "框架合同", "其他"] },
        contractExpiryState: { values: ["正常", "即将到期", "已到期", "已终止"] },
        wechatProcessingStatus: {
          values: ["待整理", "已转采购申请", "已转入库", "已转出库", "已归档", "无效"],
        },
        paperVerified: { values: ["是", "否"] },
        purchaseSourceType: { values: ["平台采购", "供应商采购", "线下采购"] },
        purchaseRecordStatus: { values: ["待采购", "已下单", "部分到货", "已到货", "已取消"] },
        purchaseSupplierPolicy: { values: ["供应商可选"] },
        inventoryMovementType: { values: ["入库", "出库", "盘盈", "盘亏", "期初"] },
        issueTargetType: { values: ["internal_office", "project_site", "subcontractor"] },
        projectUsageStatus: { values: ["待处理", "已出库", "部分出库", "已驳回"] },
      },
    });
  });

  it("returns inventory MVP field metadata", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/meta/inventory",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      stockFormula: "current_stock = sum(inbound and adjustment-in movements) - sum(outbound and adjustment-out movements)",
      mvpScreens: ["物料管理", "入库登记", "出库登记", "当前库存查询", "项目点领用记录"],
      excluded: ["批次追踪", "条码扫码", "多级仓库调拨", "高级库存预警"],
      fields: {
        material: expect.arrayContaining(["material_code", "material_name", "specification", "base_unit"]),
        warehouse: expect.arrayContaining(["warehouse_code", "warehouse_name", "warehouse_type"]),
        inbound: expect.arrayContaining(["inbound_no", "inbound_date", "warehouse_id", "material_id", "quantity"]),
        outbound: expect.arrayContaining(["outbound_no", "outbound_date", "warehouse_id", "material_id", "quantity"]),
        projectUsage: expect.arrayContaining(["request_no", "project_site_id", "material_id", "requested_quantity"]),
      },
    });
  });
});
