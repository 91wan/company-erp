import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  businessProject,
  material,
  party,
  projectSite,
  projectSiteKitchenEquipment,
  projectUsageRequest,
  warehouse,
} from "./appTestHelpers";
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";
import { useProjectSitesLoadDefaults } from "../src/components/project-sites/useProjectSitesLoadDefaults";

function renderLoadDefaults() {
  return renderHook(() => {
    const [usageForm, setUsageForm] = useState(createInitialUsageForm);
    const [issueForm, setIssueForm] = useState(createInitialIssueForm);
    const [kitchenEquipmentForm, setKitchenEquipmentForm] = useState(createInitialKitchenEquipmentForm);
    const [kitchenEquipmentChangeForm, setKitchenEquipmentChangeForm] = useState(createInitialKitchenEquipmentChangeForm);
    const defaults = useProjectSitesLoadDefaults({
      setUsageForm,
      setIssueForm,
      setKitchenEquipmentForm,
      setKitchenEquipmentChangeForm,
    });

    return {
      usageForm,
      issueForm,
      kitchenEquipmentForm,
      kitchenEquipmentChangeForm,
      ...defaults,
    };
  });
}

describe("useProjectSitesLoadDefaults", () => {
  it("fills default project-site, usage, master-data, usage-option, and equipment context", () => {
    const { result } = renderLoadDefaults();

    act(() => result.current.onProjectSitesLoaded([projectSite]));
    expect(result.current.usageForm.projectSiteId).toBe(projectSite.id);
    expect(result.current.kitchenEquipmentForm.projectSiteId).toBe(projectSite.id);
    expect(result.current.kitchenEquipmentChangeForm.projectSiteId).toBe(projectSite.id);

    act(() => result.current.onUsageRequestsLoaded([projectUsageRequest]));
    expect(result.current.issueForm.requestId).toBe(projectUsageRequest.id);

    act(() => result.current.onMasterDataLoaded({ parties: [party], materials: [material], warehouses: [warehouse], businessProjects: [businessProject] }));
    expect(result.current.usageForm.warehouseId).toBe(warehouse.id);
    expect(result.current.usageForm.materialId).toBe(material.id);
    expect(result.current.usageForm.unit).toBe(material.projectSiteSaleUnit);

    act(() => result.current.onKitchenEquipmentLoaded([projectSiteKitchenEquipment]));
    expect(result.current.kitchenEquipmentChangeForm.equipmentId).toBe(projectSiteKitchenEquipment.id);
    expect(result.current.kitchenEquipmentChangeForm.equipmentName).toBe(projectSiteKitchenEquipment.equipmentName);
  });

  it("does not write undefined when loaders return empty arrays", () => {
    const { result } = renderLoadDefaults();

    act(() => {
      result.current.onProjectSitesLoaded([]);
      result.current.onUsageRequestsLoaded([]);
      result.current.onMasterDataLoaded({ parties: [], materials: [], warehouses: [], businessProjects: [] });
      result.current.onUsageOptionsLoaded({ defaultWarehouse: null, materials: [] });
      result.current.onKitchenEquipmentLoaded([]);
    });

    expect(result.current.usageForm).toMatchObject({ projectSiteId: "", warehouseId: "", materialId: "", unit: "" });
    expect(result.current.issueForm.requestId).toBe("");
    expect(result.current.kitchenEquipmentForm.projectSiteId).toBe("");
    expect(result.current.kitchenEquipmentChangeForm).toMatchObject({ projectSiteId: "", equipmentId: "", equipmentName: "" });
  });
});
