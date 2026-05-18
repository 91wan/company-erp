import { describe, expect, it, vi } from "vitest";
import { buildProjectSitesDataInput } from "../src/components/project-sites/projectSitesDataInput";

describe("projectSitesDataInput", () => {
  it("builds headquarters data input with global master data and default callbacks", () => {
    const input = buildProjectSitesDataInput({
      permissions: { canEditSites: true },
      options: { usageOnly: false },
      dependencies: {
        loadProjectSites: vi.fn(),
        loadUsageRequests: vi.fn(),
        loadParties: vi.fn(),
        loadMaterials: vi.fn(),
        loadWarehouses: vi.fn(),
        loadUsageOptions: vi.fn(),
        loadBusinessProjects: vi.fn(),
        loadInvestmentSummary: vi.fn(),
        loadComplianceSummary: vi.fn(),
        loadKitchenEquipment: vi.fn(),
        loadKitchenEquipmentChangeRequests: vi.fn(),
      },
      defaults: {
        onProjectSitesLoaded: vi.fn(),
        onUsageRequestsLoaded: vi.fn(),
        onMasterDataLoaded: vi.fn(),
        onUsageOptionsLoaded: vi.fn(),
        onKitchenEquipmentLoaded: vi.fn(),
      },
    });

    expect(input.canEditSites).toBe(true);
    expect(input.usageOnly).toBe(false);
    expect(input.loadBusinessProjects).toBeDefined();
    expect(input.onMasterDataLoaded).toBeDefined();
    expect(input.onUsageOptionsLoaded).toBeDefined();
  });

  it("keeps external project-site mode scoped to usage options and injected loaders", () => {
    const loadUsageOptions = vi.fn();
    const loadParties = vi.fn();

    const input = buildProjectSitesDataInput({
      permissions: { canEditSites: false },
      options: { usageOnly: true },
      dependencies: {
        loadProjectSites: vi.fn(),
        loadUsageRequests: vi.fn(),
        loadParties,
        loadMaterials: vi.fn(),
        loadWarehouses: vi.fn(),
        loadUsageOptions,
        loadBusinessProjects: vi.fn(),
        loadInvestmentSummary: vi.fn(),
        loadComplianceSummary: vi.fn(),
        loadKitchenEquipment: vi.fn(),
        loadKitchenEquipmentChangeRequests: vi.fn(),
      },
      defaults: {},
    });

    expect(input.canEditSites).toBe(false);
    expect(input.usageOnly).toBe(true);
    expect(input.loadUsageOptions).toBe(loadUsageOptions);
    expect(input.loadParties).toBe(loadParties);
  });
});
