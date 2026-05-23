import { describe, expect, it } from "vitest";
import { runImportPilotSmoke } from "../src/importPilotSmoke";

describe("import pilot smoke runner", () => {
  it("runs the NAS pilot import chains without legacy health certificate fields or PDF/image requirements", async () => {
    const result = await runImportPilotSmoke({ silent: true });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.steps.map((step) => step.name)).toEqual([
      "基础资料：往来方导入",
      "基础资料：物料导入",
      "基础资料：默认供应商不存在为 warning",
      "项目点合规：项目点导入",
      "项目点合规：项目点现场人员导入",
      "项目点合规：项目点健康证导入",
      "项目点合规：公司健康证导入",
      "合同库存：合同到期提醒导入",
      "合同库存：期初库存导入",
    ]);
    expect(result.summary.projectSiteHealthCertificateAffectsCompliance).toBe(true);
    expect(result.summary.companyHealthCertificateAffectsCompliance).toBe(false);
    expect(result.summary.openingInventoryMovementType).toBe("opening");
    expect(result.summary.defaultWarehouseName).toBe("无锡总部仓库");
    expect(result.summary.rosterPersonHasProjectSiteLocator).toBe(true);
    expect(result.summary.contractHasExpiryLocator).toBe(true);
    expect(result.summary.openingInventoryHasMovementLocator).toBe(true);
    expect(result.summary.defaultSupplierOptionalWorks).toBe(true);
  });
});
