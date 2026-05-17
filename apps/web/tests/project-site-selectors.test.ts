import { describe, expect, it } from "vitest";
import { party, projectSite, projectSiteKitchenEquipment, projectSiteKitchenEquipmentChangeRequest, projectUsageRequest } from "./appTestHelpers";
import {
  filterKitchenEquipment,
  filterKitchenEquipmentChangeRequests,
  filterProjectSites,
  filterProjectUsageRequests,
  selectProjectSite,
  selectProjectSiteParties,
} from "../src/components/project-sites/projectSiteSelectors";

describe("projectSiteSelectors", () => {
  const subcontractedSite = {
    ...projectSite,
    id: "22222222-2222-4222-8222-222222222222",
    siteCode: "SITE-SZ-002",
    siteName: "苏州外包项目点",
    serviceMode: "subcontracted" as const,
    subcontractorPartyName: "苏州个人承包人",
    region: "苏州",
  };

  it("filters project sites by project, client, subcontractor, region, project, and manager fields", () => {
    expect(filterProjectSites([projectSite, subcontractedSite], "承包人")).toEqual([subcontractedSite]);
    expect(filterProjectSites([projectSite, subcontractedSite], "SITE-WX")).toEqual([projectSite]);
    expect(filterProjectSites([projectSite, subcontractedSite], "")).toHaveLength(2);
  });

  it("selects a detail site from the filtered project-site list", () => {
    const filteredSites = filterProjectSites([projectSite, subcontractedSite], "苏州");

    expect(selectProjectSite(filteredSites, subcontractedSite.id)).toEqual(subcontractedSite);
    expect(selectProjectSite(filteredSites, projectSite.id)).toBeNull();
  });

  it("filters usage requests by query and status without changing headquarters behavior", () => {
    const issuedRequest = {
      ...projectUsageRequest,
      id: "23232323-2323-4232-8232-232323232323",
      requestNo: "USE20260511002",
      projectSiteName: "苏州外包项目点",
      materialName: "餐巾纸",
      status: "issued" as const,
    };

    expect(filterProjectUsageRequests([projectUsageRequest, issuedRequest], "餐巾纸", "all")).toEqual([issuedRequest]);
    expect(filterProjectUsageRequests([projectUsageRequest, issuedRequest], "", "pending")).toEqual([projectUsageRequest]);
  });

  it("keeps usage-only equipment and change requests scoped to visible project sites", () => {
    const otherEquipment = {
      ...projectSiteKitchenEquipment,
      id: "24242424-2424-4242-8242-242424242424",
      projectSiteId: subcontractedSite.id,
      projectSiteName: subcontractedSite.siteName,
      equipmentName: "外包项目点蒸箱",
    };
    const otherChangeRequest = {
      ...projectSiteKitchenEquipmentChangeRequest,
      id: "25252525-2525-4252-8252-252525252525",
      projectSiteId: subcontractedSite.id,
      projectSiteName: subcontractedSite.siteName,
      equipmentName: otherEquipment.equipmentName,
    };

    const scopedEquipment = filterKitchenEquipment(
      [projectSiteKitchenEquipment, otherEquipment],
      "",
      { projectSiteIds: [projectSite.id] },
    );
    const scopedChanges = filterKitchenEquipmentChangeRequests(
      [projectSiteKitchenEquipmentChangeRequest, otherChangeRequest],
      { kitchenEquipment: scopedEquipment, projectSiteIds: [projectSite.id], usageOnly: true },
    );

    expect(scopedEquipment).toEqual([projectSiteKitchenEquipment]);
    expect(scopedChanges).toEqual([projectSiteKitchenEquipmentChangeRequest]);
  });

  it("groups client, operator, and subcontractor parties for the site form", () => {
    const client = { ...party, id: "client-1", partyTypes: ["client"] as const };
    const operator = { ...party, id: "operator-1", partyTypes: ["operator"] as const };
    const subcontractor = { ...party, id: "subcontractor-1", partyTypes: ["subcontractor"] as const };
    const grouped = selectProjectSiteParties([party, client, operator, subcontractor]);

    expect(grouped.clientParties).toEqual([client]);
    expect(grouped.operatorParties).toEqual([operator]);
    expect(grouped.subcontractorParties).toEqual([subcontractor]);
  });
});
