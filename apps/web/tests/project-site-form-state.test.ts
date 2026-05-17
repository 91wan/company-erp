import { describe, expect, it } from "vitest";
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialSiteForm,
  createInitialUsageForm,
  resetIssueFormAfterIssue,
  resetKitchenEquipmentChangeFormAfterCreate,
  resetKitchenEquipmentFormAfterCreate,
  resetSiteFormAfterCreate,
  resetUsageFormAfterCreate,
} from "../src/components/project-sites/projectSiteFormState";

describe("projectSiteFormState", () => {
  it("creates initial form values used by ProjectSitesWorkspace", () => {
    expect(createInitialSiteForm()).toMatchObject({ siteCode: "", serviceMode: "direct", remark: "" });
    expect(createInitialUsageForm()).toMatchObject({ requestNo: "", projectSiteId: "", unit: "" });
    expect(createInitialIssueForm()).toMatchObject({ requestId: "", handledBy: "", receivedByName: "" });
    expect(createInitialKitchenEquipmentForm()).toMatchObject({ unit: "台", status: "in_use", sourceContractId: "" });
    expect(createInitialKitchenEquipmentChangeForm()).toMatchObject({ changeType: "status_change", proposedStatus: "" });
  });

  it("resets site creation while keeping usage defaults outside the helper", () => {
    const reset = resetSiteFormAfterCreate();
    expect(reset).toEqual(createInitialSiteForm());
  });

  it("resets usage creation while preserving current project site, warehouse, material, and unit", () => {
    const reset = resetUsageFormAfterCreate({
      ...createInitialUsageForm(),
      requestNo: "USE-001",
      requestDate: "2026-05-17",
      projectSiteId: "site-1",
      warehouseId: "warehouse-1",
      materialId: "material-1",
      requestedQuantity: "3",
      unit: "箱",
      purpose: "补货",
      requestedBy: "总部",
      expectedDate: "2026-05-20",
    });

    expect(reset).toMatchObject({
      requestNo: "",
      requestDate: "",
      projectSiteId: "site-1",
      warehouseId: "warehouse-1",
      materialId: "material-1",
      requestedQuantity: "",
      unit: "箱",
      purpose: "",
      requestedBy: "",
      expectedDate: "",
    });
  });

  it("resets issue form after outbound while preserving selected request and handler", () => {
    const reset = resetIssueFormAfterIssue({
      ...createInitialIssueForm(),
      requestId: "usage-1",
      outboundNo: "OUT-001",
      movementDate: "2026-05-17",
      quantity: "2",
      handledBy: "仓管",
      receivedByName: "项目点",
    });

    expect(reset).toMatchObject({
      requestId: "usage-1",
      outboundNo: "",
      movementDate: "",
      quantity: "",
      handledBy: "仓管",
      receivedByName: "",
    });
  });

  it("resets kitchen equipment forms while preserving current project-site context", () => {
    const equipmentReset = resetKitchenEquipmentFormAfterCreate({
      ...createInitialKitchenEquipmentForm(),
      projectSiteId: "site-1",
      equipmentName: "六门冰柜",
      quantity: "1",
      location: "后厨",
      companyAssetTag: "WX-ZC-001",
    });
    const changeReset = resetKitchenEquipmentChangeFormAfterCreate({
      ...createInitialKitchenEquipmentChangeForm(),
      projectSiteId: "site-1",
      equipmentId: "equipment-1",
      equipmentName: "六门冰柜",
      proposedQuantity: "1",
      proposedLocation: "后厨",
      proposedStatus: "damaged",
      description: "门封条损坏",
    });

    expect(equipmentReset).toMatchObject({
      projectSiteId: "site-1",
      equipmentName: "",
      quantity: "",
      unit: "台",
      status: "in_use",
      companyAssetTag: "",
    });
    expect(changeReset).toMatchObject({
      projectSiteId: "site-1",
      equipmentId: "equipment-1",
      equipmentName: "六门冰柜",
      proposedQuantity: "",
      proposedLocation: "",
      proposedStatus: "",
      description: "",
    });
  });
});
