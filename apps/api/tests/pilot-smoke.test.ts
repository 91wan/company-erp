import { describe, expect, it } from "vitest";
import {
  DEMO_CODES,
  buildPilotSummary,
  createPilotApiClient,
  redactSecrets,
  reuseOrCreate,
  type PilotApiClient,
} from "../src/pilotSmoke.js";

describe("pilot workflow smoke helpers", () => {
  it("uses only DEMO-prefixed business identifiers", () => {
    expect(Object.values(DEMO_CODES).every((value) => value === "WH-WX-HQ" || value.startsWith("DEMO-"))).toBe(true);
  });

  it("redacts credentials from summary objects", () => {
    const redacted = redactSecrets(
      {
        username: "admin",
        password: "secret-password",
        nested: { token: "cookie-value", ok: true },
      },
      ["secret-password", "cookie-value"],
    );

    expect(JSON.stringify(redacted)).not.toContain("secret-password");
    expect(JSON.stringify(redacted)).not.toContain("cookie-value");
    expect(redacted).toMatchObject({
      username: "admin",
      password: "[redacted]",
      nested: { token: "[redacted]", ok: true },
    });
  });

  it("reuses existing records before creating new ones", async () => {
    const calls: string[] = [];
    const existing = { id: "demo-id", partyCode: DEMO_CODES.supplierPartyCode };
    const client = {
      get: async () => {
        calls.push("get");
        return { parties: [existing] };
      },
      post: async () => {
        calls.push("post");
        return { party: { id: "new-id" } };
      },
    } as Pick<PilotApiClient, "get" | "post">;

    const result = await reuseOrCreate(client, {
      label: "supplier party",
      listPath: "/api/parties?q=DEMO-SUPPLIER",
      collectionKey: "parties",
      createPath: "/api/parties",
      responseKey: "party",
      match: (record) => record.partyCode === DEMO_CODES.supplierPartyCode,
      payload: { partyCode: DEMO_CODES.supplierPartyCode },
    });

    expect(result.status).toBe("reused");
    expect(result.record).toBe(existing);
    expect(calls).toEqual(["get"]);
  });

  it("fails API requests without leaking the login password", async () => {
    const client = createPilotApiClient({
      baseUrl: "http://erp.local",
      username: "admin",
      password: "secret-password",
      fetchImpl: async () =>
        ({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: async () => "database unavailable",
        }) as Response,
    });

    await expect(client.get("/api/parties")).rejects.toThrow("GET /api/parties failed");
    await expect(client.get("/api/parties")).rejects.not.toThrow("secret-password");
  });

  it("builds a final summary without raw credentials", () => {
    const summary = buildPilotSummary(
      {
        apiBaseUrl: "http://erp.local",
        username: "admin",
        password: "secret-password",
      },
      {
        partyIds: ["p1"],
        materialId: "m1",
        warehouseId: "w1",
        projectSiteId: "s1",
        purchaseRequestId: "pr1",
        purchaseRecordId: "po1",
        inboundMovementId: "in1",
        usageRequestId: "use1",
        contractId: "c1",
        certificateId: "cert1",
        inventoryBalance: 8,
        chargeAmount: 196,
      },
    );

    expect(JSON.stringify(summary)).not.toContain("secret-password");
    expect(summary).toMatchObject({
      apiBaseUrl: "http://erp.local",
      username: "admin",
      password: "[redacted]",
      verified: {
        inventoryBalance: 8,
        chargeAmount: 196,
      },
    });
  });
});
