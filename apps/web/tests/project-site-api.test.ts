import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultCreateKitchenEquipment,
  defaultCreateKitchenEquipmentChangeRequest,
  defaultCreateUsageRequest,
  defaultIssueUsageRequest,
  defaultReviewKitchenEquipmentChangeRequest,
} from "../src/components/project-sites/projectSiteApi";
import {
  projectSiteKitchenEquipment,
  projectSiteKitchenEquipmentChangeRequest,
  projectUsageRequest,
} from "./appTestHelpers";

function mockJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function lastRequest(): { url: string; init: RequestInit } {
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url: String(url), init: init as RequestInit };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("projectSiteApi defaults", () => {
  it("posts project usage requests to the existing endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse({ projectUsageRequest })));

    await defaultCreateUsageRequest({
      requestNo: "USE-API-001",
      requestDate: "2026-05-17",
      projectSiteId: "site-1",
      warehouseId: "warehouse-1",
      materialId: "material-1",
      requestedQuantity: 3,
      unit: "箱",
      purpose: "补充餐盒",
      requestedBy: "总部",
      expectedDate: "2026-05-20",
    });

    const request = lastRequest();
    expect(request.url).toBe("http://localhost:3001/api/project-usage-requests");
    expect(request.init.method).toBe("POST");
    expect(JSON.parse(String(request.init.body))).toMatchObject({ requestNo: "USE-API-001", requestedQuantity: 3 });
  });

  it("posts issue requests to the existing issue endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse({ projectUsageRequest })));

    await defaultIssueUsageRequest("usage-1", {
      outboundNo: "OUT-API-001",
      movementDate: "2026-05-17",
      quantity: 2,
      handledBy: "仓管",
      receivedByName: "项目点",
    });

    const request = lastRequest();
    expect(request.url).toBe("http://localhost:3001/api/project-usage-requests/usage-1/issue");
    expect(request.init.method).toBe("POST");
    expect(JSON.parse(String(request.init.body))).toMatchObject({ outboundNo: "OUT-API-001", quantity: 2 });
  });

  it("posts kitchen equipment create and change requests to existing endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ kitchenEquipment: projectSiteKitchenEquipment }))
      .mockResolvedValueOnce(mockJsonResponse({ kitchenEquipmentChangeRequest: projectSiteKitchenEquipmentChangeRequest })));

    await defaultCreateKitchenEquipment({
      projectSiteId: "site-1",
      equipmentName: "六门冰柜",
      quantity: 1,
      unit: "台",
      status: "in_use",
    });
    await defaultCreateKitchenEquipmentChangeRequest({
      projectSiteId: "site-1",
      equipmentName: "六门冰柜",
      changeType: "status_change",
      description: "门封条损坏",
    });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/api/project-site-kitchen-equipment");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:3001/api/project-site-kitchen-equipment-change-requests");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
  });

  it("posts kitchen equipment review requests to the existing review endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse({
      kitchenEquipmentChangeRequest: projectSiteKitchenEquipmentChangeRequest,
    })));

    await defaultReviewKitchenEquipmentChangeRequest("change-1", { reviewStatus: "approved" });

    const request = lastRequest();
    expect(request.url).toBe("http://localhost:3001/api/project-site-kitchen-equipment-change-requests/change-1/review");
    expect(request.init.method).toBe("POST");
    expect(JSON.parse(String(request.init.body))).toMatchObject({ reviewStatus: "approved" });
  });
});
