import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  material,
  party,
  projectSite,
  projectSiteComplianceSummary,
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  projectUsageRequest,
} from "./appTestHelpers";
import { createInitialUsageForm } from "../src/components/project-sites/projectSiteFormState";
import { useProjectSitesWorkspaceModel } from "../src/components/project-sites/useProjectSitesWorkspaceModel";

const otherProjectSite = {
  ...projectSite,
  id: "22222222-2222-4222-8222-222222222222",
  siteCode: "SITE-SZ-002",
  siteName: "苏州外包项目点",
  region: "苏州",
  clientPartyName: "苏州客户",
};

const otherEquipment = {
  ...projectSiteKitchenEquipment,
  id: "33333333-3333-4333-8333-333333333333",
  projectSiteId: otherProjectSite.id,
  projectSiteCode: otherProjectSite.siteCode,
  projectSiteName: otherProjectSite.siteName,
  equipmentName: "苏州项目点蒸箱",
};

const otherEquipmentChangeRequest = {
  ...projectSiteKitchenEquipmentChangeRequest,
  id: "44444444-4444-4444-8444-444444444444",
  projectSiteId: otherProjectSite.id,
  projectSiteCode: otherProjectSite.siteCode,
  projectSiteName: otherProjectSite.siteName,
  equipmentName: otherEquipment.equipmentName,
};

function renderProjectSitesWorkspaceModel(options: {
  usageOnly: boolean;
  query?: string;
  selectedDetailSiteId?: string;
}) {
  return renderHook(() => {
    const [usageForm, setUsageForm] = useState(createInitialUsageForm());
    const model = useProjectSitesWorkspaceModel({
      usageOnly: options.usageOnly,
      sites: options.usageOnly ? [projectSite] : [projectSite, otherProjectSite],
      usageRequests: [projectUsageRequest],
      kitchenEquipment: [projectSiteKitchenEquipment, otherEquipment],
      kitchenEquipmentChangeRequests: [projectSiteKitchenEquipmentChangeRequest, otherEquipmentChangeRequest],
      complianceSummaries: { [projectSite.id]: projectSiteComplianceSummary },
      parties: [
        { ...party, id: "client", partyTypes: ["client"] },
        { ...party, id: "operator", partyTypes: ["operator"] },
        { ...party, id: "subcontractor", partyTypes: ["subcontractor"] },
      ],
      materials: [{ ...material, unit: "箱" }],
      query: options.query ?? "",
      usageFilter: "all",
      selectedDetailSiteId: options.selectedDetailSiteId ?? projectSite.id,
      setUsageForm,
    });
    return { model, usageForm };
  });
}

describe("useProjectSitesWorkspaceModel", () => {
  it("builds headquarters derived data, metrics, parties, and detail selection", () => {
    const { result } = renderProjectSitesWorkspaceModel({
      usageOnly: false,
      query: "",
      selectedDetailSiteId: projectSite.id,
    });

    expect(result.current.model.scopedProjectSiteIds).toBeUndefined();
    expect(result.current.model.filteredSites).toEqual([projectSite, otherProjectSite]);
    expect(result.current.model.selectedDetailSite).toEqual(projectSite);
    expect(result.current.model.selectedDetailSiteData.usageRequests).toEqual([projectUsageRequest]);
    expect(result.current.model.filteredKitchenEquipment).toEqual([projectSiteKitchenEquipment, otherEquipment]);
    expect(result.current.model.metrics.activeSiteCount).toBe(2);
    expect(result.current.model.metrics.pendingUsageCount).toBe(1);
    expect(result.current.model.clientParties).toHaveLength(1);
    expect(result.current.model.operatorParties).toHaveLength(1);
    expect(result.current.model.subcontractorParties).toHaveLength(1);

    act(() => result.current.model.updateSelectedMaterial(material.id));
    expect(result.current.usageForm.materialId).toBe(material.id);
    expect(result.current.usageForm.unit).toBe("箱");
  });

  it("filters headquarters risk ledger by project-site query", () => {
    const { result } = renderProjectSitesWorkspaceModel({
      usageOnly: false,
      query: "苏州",
      selectedDetailSiteId: otherProjectSite.id,
    });

    expect(result.current.model.filteredSites).toEqual([otherProjectSite]);
    expect(result.current.model.selectedDetailSite).toEqual(otherProjectSite);
  });

  it("keeps usage-only equipment and change requests scoped to visible project sites", () => {
    const { result } = renderProjectSitesWorkspaceModel({
      usageOnly: true,
      selectedDetailSiteId: projectSite.id,
    });

    expect(result.current.model.scopedProjectSiteIds).toEqual([projectSite.id]);
    expect(result.current.model.filteredKitchenEquipment).toEqual([projectSiteKitchenEquipment]);
    expect(result.current.model.filteredKitchenEquipmentChangeRequests).toEqual([projectSiteKitchenEquipmentChangeRequest]);
  });
});
