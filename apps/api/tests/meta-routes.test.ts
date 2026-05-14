import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";

describe("metadata API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns health without requiring a database connection", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "company-erp-api",
      database: { configured: expect.any(Boolean) },
      version: { shortCommitSha: expect.any(String) },
    });
  });

  it("returns safe unknown app version values when deployment metadata is not configured", async () => {
    vi.stubEnv("APP_COMMIT_SHA", "");
    vi.stubEnv("APP_BUILD_TIME", "");
    vi.stubEnv("APP_DEPLOYED_AT", "");
    vi.stubEnv("APP_PACKAGE_VERSION", "");
    vi.stubEnv("APP_ENVIRONMENT", "");
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/app-version" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      appVersion: {
        packageVersion: "unknown",
        commitSha: "unknown",
        shortCommitSha: "unknown",
        buildTime: "unknown",
        deployedAt: "unknown",
        environment: "unknown",
      },
    });
  });

  it("returns app version values from deployment environment metadata", async () => {
    vi.stubEnv("APP_COMMIT_SHA", "9ac5cb74a9eb36136c2634399e9812def3be26d6");
    vi.stubEnv("APP_BUILD_TIME", "2026-05-13T07:00:00.000Z");
    vi.stubEnv("APP_DEPLOYED_AT", "2026-05-13T07:30:00.000Z");
    vi.stubEnv("APP_PACKAGE_VERSION", "0.1.0");
    vi.stubEnv("APP_ENVIRONMENT", "nas");
    const app = await buildApp();

    const versionResponse = await app.inject({ method: "GET", url: "/api/app-version" });
    const healthResponse = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(versionResponse.statusCode).toBe(200);
    expect(versionResponse.json()).toEqual({
      appVersion: {
        packageVersion: "0.1.0",
        commitSha: "9ac5cb74a9eb36136c2634399e9812def3be26d6",
        shortCommitSha: "9ac5cb7",
        buildTime: "2026-05-13T07:00:00.000Z",
        deployedAt: "2026-05-13T07:30:00.000Z",
        environment: "nas",
      },
    });
    expect(healthResponse.json()).toMatchObject({
      version: { shortCommitSha: "9ac5cb7" },
    });
  });

  it("returns the fixed MVP roles", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/meta/roles" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      roles: [
        { code: "admin", label: "系统管理员", description: "系统配置、账号和全部数据管理" },
        { code: "hr", label: "人事", description: "员工、部门和项目点人员关系维护" },
        { code: "procurement", label: "采购", description: "采购和合同业务处理" },
        { code: "warehouse", label: "仓库", description: "入库、库存和出库记录处理" },
        { code: "project_site", label: "项目点", description: "项目点相关记录和领用处理" },
        { code: "marketing", label: "市场", description: "客户、商机和项目前期资料交接" },
        { code: "operations", label: "运营", description: "项目执行、库存数量查看和领用申请" },
        { code: "external_project_site", label: "项目点外部账号", description: "外部项目点合规资料与领用申请提交" },
        { code: "viewer", label: "只读", description: "内部只读访问" },
      ],
    });
  });

  it("returns fixed MVP permission metadata", async () => {
    const app = await buildApp();
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
        businessProjects: { manage: ["admin", "procurement"] },
        inventoryQuantity: { read: expect.arrayContaining(["operations"]) },
        projectUsageRequest: { manage: ["admin", "operations", "project_site", "external_project_site"] },
        userAccounts: { manage: ["admin"] },
        roleAssignment: { manage: ["admin"] },
      },
    });
  });

  it("returns the MVP dictionaries used by import templates", async () => {
    const app = await buildApp();
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
        contractStatus: { values: ["草稿", "履行中", "已完成", "已终止", "已取消"] },
        contractDirection: { values: ["采购合同", "客户服务合同", "外包合同", "其他"] },
        contractForm: { values: ["一次性合同", "固定期限合同", "框架合同", "工程/建设合同"] },
        contractSubjectCategory: {
          values: [
            "食材",
            "餐具用品",
            "厨房设备",
            "广告标识/广告制作",
            "装修/改造",
            "土建/厂房/土地建设",
            "电梯",
            "团餐/食堂运营服务",
            "分包/外包服务",
            "其他",
          ],
        },
        contractExpiryState: { values: ["正常", "即将到期", "已到期", "已终止"] },
        wechatProcessingStatus: {
          values: ["待整理", "已转采购申请", "已转入库", "已转出库", "已归档", "无效"],
        },
        paperVerified: { values: ["是", "否"] },
        purchaseSourceType: { values: ["平台采购", "供应商采购", "线下采购"] },
        purchaseRecordStatus: { values: ["待采购", "已下单", "部分到货", "已到货", "已取消"] },
        purchaseSupplierPolicy: { values: ["供应商可选"] },
        inventoryMovementType: { values: ["入库", "出库", "盘盈", "盘亏", "期初"] },
        issueTargetType: { values: ["项目点", "外包方", "公司部门", "公司个人"] },
        projectUsageStatus: { values: ["待处理", "已出库", "部分出库", "已驳回"] },
      },
    });
  });

  it("returns inventory MVP field metadata", async () => {
    const app = await buildApp();
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
