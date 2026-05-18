import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  businessProject,
  material,
  party,
  projectSite,
  projectSiteComplianceSummary,
  projectSiteInvestmentSummary,
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  projectUsageRequest,
  warehouse,
} from "./appTestHelpers";
import { useProjectSitesData } from "../src/components/project-sites/useProjectSitesData";

describe("useProjectSitesData", () => {
  it("loads headquarters project-site data and coordinates investment/compliance/equipment state", async () => {
    const onProjectSitesLoaded = vi.fn();
    const onUsageRequestsLoaded = vi.fn();
    const onMasterDataLoaded = vi.fn();
    const onKitchenEquipmentLoaded = vi.fn();
    const loadProjectSites = vi.fn().mockResolvedValue([projectSite]);
    const loadUsageRequests = vi.fn().mockResolvedValue([projectUsageRequest]);
    const loadParties = vi.fn().mockResolvedValue([party]);
    const loadMaterials = vi.fn().mockResolvedValue([material]);
    const loadWarehouses = vi.fn().mockResolvedValue([warehouse]);
    const loadUsageOptions = vi.fn();
    const loadBusinessProjects = vi.fn().mockResolvedValue([businessProject]);
    const loadInvestmentSummary = vi.fn().mockResolvedValue(projectSiteInvestmentSummary);
    const loadComplianceSummary = vi.fn().mockResolvedValue(projectSiteComplianceSummary);
    const loadKitchenEquipment = vi.fn().mockResolvedValue([projectSiteKitchenEquipment]);
    const loadKitchenEquipmentChangeRequests = vi.fn().mockResolvedValue([projectSiteKitchenEquipmentChangeRequest]);

    const { result } = renderHook(() =>
      useProjectSitesData({
        canEditSites: true,
        usageOnly: false,
        loadProjectSites,
        loadUsageRequests,
        loadParties,
        loadMaterials,
        loadWarehouses,
        loadUsageOptions,
        loadBusinessProjects,
        loadInvestmentSummary,
        loadComplianceSummary,
        loadKitchenEquipment,
        loadKitchenEquipmentChangeRequests,
        onProjectSitesLoaded,
        onUsageRequestsLoaded,
        onMasterDataLoaded,
        onKitchenEquipmentLoaded,
      }),
    );

    await waitFor(() => expect(result.current.siteStatus).toBe("ready"));
    await waitFor(() => expect(result.current.usageStatus).toBe("ready"));
    await waitFor(() => expect(result.current.masterStatus).toBe("ready"));
    await waitFor(() => expect(result.current.kitchenEquipmentStatus).toBe("ready"));
    await waitFor(() => expect(result.current.investmentSummaryStatus).toBe("ready"));

    expect(result.current.sites).toEqual([projectSite]);
    expect(result.current.usageRequests).toEqual([projectUsageRequest]);
    expect(result.current.parties).toEqual([party]);
    expect(result.current.materials).toEqual([
      expect.objectContaining({ id: material.id, materialName: material.materialName, unit: material.projectSiteSaleUnit }),
    ]);
    expect(result.current.warehouses).toEqual([
      expect.objectContaining({ id: warehouse.id, warehouseCode: warehouse.warehouseCode }),
    ]);
    expect(result.current.businessProjects).toEqual([businessProject]);
    expect(result.current.complianceSummaries[projectSite.id]).toEqual(projectSiteComplianceSummary);
    expect(result.current.investmentSummary).toEqual(projectSiteInvestmentSummary);
    expect(result.current.kitchenEquipment).toEqual([projectSiteKitchenEquipment]);
    expect(result.current.kitchenEquipmentChangeRequests).toEqual([projectSiteKitchenEquipmentChangeRequest]);
    expect(onProjectSitesLoaded).toHaveBeenCalledWith([projectSite]);
    expect(onUsageRequestsLoaded).toHaveBeenCalledWith([projectUsageRequest]);
    expect(onMasterDataLoaded).toHaveBeenCalledWith({
      parties: [party],
      materials: [material],
      warehouses: [warehouse],
      businessProjects: [businessProject],
    });
    expect(onKitchenEquipmentLoaded).toHaveBeenCalledWith([projectSiteKitchenEquipment]);
  });

  it("uses scoped usage options instead of global master-data loaders for external project-site mode", async () => {
    const loadParties = vi.fn();
    const loadMaterials = vi.fn();
    const loadWarehouses = vi.fn();
    const loadBusinessProjects = vi.fn();
    const loadProjectSites = vi.fn().mockResolvedValue([projectSite]);
    const loadUsageRequests = vi.fn().mockResolvedValue([]);
    const loadInvestmentSummary = vi.fn();
    const loadComplianceSummary = vi.fn().mockResolvedValue(projectSiteComplianceSummary);
    const loadKitchenEquipment = vi.fn().mockResolvedValue([]);
    const loadKitchenEquipmentChangeRequests = vi.fn().mockResolvedValue([]);
    const loadUsageOptions = vi.fn().mockResolvedValue({
      defaultWarehouse: { id: warehouse.id, warehouseCode: warehouse.warehouseCode, warehouseName: warehouse.warehouseName },
      materials: [{ id: material.id, materialCode: material.materialCode, materialName: material.materialName, specification: material.specification, unit: "箱" }],
    });

    const { result } = renderHook(() =>
      useProjectSitesData({
        canEditSites: false,
        usageOnly: true,
        loadProjectSites,
        loadUsageRequests,
        loadParties,
        loadMaterials,
        loadWarehouses,
        loadUsageOptions,
        loadBusinessProjects,
        loadInvestmentSummary,
        loadComplianceSummary,
        loadKitchenEquipment,
        loadKitchenEquipmentChangeRequests,
      }),
    );

    await waitFor(() => expect(result.current.masterStatus).toBe("ready"));
    await waitFor(() => expect(result.current.investmentSummaryStatus).toBe("idle"));

    expect(loadUsageOptions).toHaveBeenCalledTimes(1);
    expect(loadParties).not.toHaveBeenCalled();
    expect(loadMaterials).not.toHaveBeenCalled();
    expect(loadWarehouses).not.toHaveBeenCalled();
    expect(loadBusinessProjects).not.toHaveBeenCalled();
    expect(result.current.warehouses).toEqual([expect.objectContaining({ id: warehouse.id })]);
    expect(result.current.materials).toEqual([expect.objectContaining({ id: material.id, unit: "箱" })]);
  });
});
