import { describe, expect, it, vi } from "vitest";
import {
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  projectUsageRequest,
} from "./appTestHelpers";
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialSiteForm,
  createInitialUsageForm,
} from "../src/components/project-sites/projectSiteFormState";
import { buildProjectSiteMutationInput } from "../src/components/project-sites/projectSitesMutationInput";

describe("buildProjectSiteMutationInput", () => {
  it("preserves usage request and issue handler dependencies without changing confirmation state", () => {
    const createUsageRequest = vi.fn();
    const issueUsageRequest = vi.fn();
    const setOpenFormDrawer = vi.fn();
    const setPendingIssueConfirm = vi.fn();

    const input = buildProjectSiteMutationInput({
      options: { usageOnly: true },
      forms: {
        siteForm: createInitialSiteForm(),
        usageForm: { ...createInitialUsageForm(), requestNo: "USE-001" },
        issueForm: { ...createInitialIssueForm(), requestId: projectUsageRequest.id },
        kitchenEquipmentForm: createInitialKitchenEquipmentForm(),
        kitchenEquipmentChangeForm: createInitialKitchenEquipmentChangeForm(),
      },
      data: { kitchenEquipment: [projectSiteKitchenEquipment] },
      dependencies: {
        createProjectSite: vi.fn(),
        createUsageRequest,
        issueUsageRequest,
        createKitchenEquipment: vi.fn(),
        createKitchenEquipmentChangeRequest: vi.fn(),
        reviewKitchenEquipmentChangeRequest: vi.fn(),
        loadKitchenEquipment: vi.fn(),
      },
      setters: {
        setSites: vi.fn(),
        setUsageRequests: vi.fn(),
        setIssueForm: vi.fn(),
        setSiteForm: vi.fn(),
        setUsageForm: vi.fn(),
        setKitchenEquipment: vi.fn(),
        setKitchenEquipmentChangeRequests: vi.fn(),
        setKitchenEquipmentForm: vi.fn(),
        setKitchenEquipmentChangeForm: vi.fn(),
        setKitchenEquipmentStatus: vi.fn(),
        setSelectedInvestmentSiteId: vi.fn(),
        setOpenFormDrawer,
      },
      confirmation: {
        pendingIssueConfirm: false,
        setPendingIssueConfirm,
      },
    });

    expect(input.usageOnly).toBe(true);
    expect(input.createUsageRequest).toBe(createUsageRequest);
    expect(input.issueUsageRequest).toBe(issueUsageRequest);
    expect(input.setOpenFormDrawer).toBe(setOpenFormDrawer);
    expect(input.pendingIssueConfirm).toBe(false);
    expect(input.setPendingIssueConfirm).toBe(setPendingIssueConfirm);
  });

  it("preserves kitchen equipment create, change, review, and refresh dependencies", () => {
    const createKitchenEquipment = vi.fn();
    const createKitchenEquipmentChangeRequest = vi.fn();
    const reviewKitchenEquipmentChangeRequest = vi.fn().mockResolvedValue(projectSiteKitchenEquipmentChangeRequest);
    const loadKitchenEquipment = vi.fn();
    const setKitchenEquipment = vi.fn();
    const setKitchenEquipmentChangeRequests = vi.fn();

    const input = buildProjectSiteMutationInput({
      options: { usageOnly: false },
      forms: {
        siteForm: createInitialSiteForm(),
        usageForm: createInitialUsageForm(),
        issueForm: createInitialIssueForm(),
        kitchenEquipmentForm: { ...createInitialKitchenEquipmentForm(), equipmentName: "蒸箱" },
        kitchenEquipmentChangeForm: {
          ...createInitialKitchenEquipmentChangeForm(),
          equipmentId: projectSiteKitchenEquipment.id,
        },
      },
      data: { kitchenEquipment: [projectSiteKitchenEquipment] },
      dependencies: {
        createProjectSite: vi.fn(),
        createUsageRequest: vi.fn(),
        issueUsageRequest: vi.fn(),
        createKitchenEquipment,
        createKitchenEquipmentChangeRequest,
        reviewKitchenEquipmentChangeRequest,
        loadKitchenEquipment,
      },
      setters: {
        setSites: vi.fn(),
        setUsageRequests: vi.fn(),
        setIssueForm: vi.fn(),
        setSiteForm: vi.fn(),
        setUsageForm: vi.fn(),
        setKitchenEquipment,
        setKitchenEquipmentChangeRequests,
        setKitchenEquipmentForm: vi.fn(),
        setKitchenEquipmentChangeForm: vi.fn(),
        setKitchenEquipmentStatus: vi.fn(),
        setSelectedInvestmentSiteId: vi.fn(),
        setOpenFormDrawer: vi.fn(),
      },
      confirmation: {
        pendingIssueConfirm: true,
        setPendingIssueConfirm: vi.fn(),
      },
    });

    expect(input.createKitchenEquipment).toBe(createKitchenEquipment);
    expect(input.createKitchenEquipmentChangeRequest).toBe(createKitchenEquipmentChangeRequest);
    expect(input.reviewKitchenEquipmentChangeRequest).toBe(reviewKitchenEquipmentChangeRequest);
    expect(input.loadKitchenEquipment).toBe(loadKitchenEquipment);
    expect(input.setKitchenEquipment).toBe(setKitchenEquipment);
    expect(input.setKitchenEquipmentChangeRequests).toBe(setKitchenEquipmentChangeRequests);
    expect(input.pendingIssueConfirm).toBe(true);
  });
});
