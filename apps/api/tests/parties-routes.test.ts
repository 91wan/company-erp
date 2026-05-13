import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { PartyConflictError, type PartyRepository } from "../src/parties";
import type { PartyDto } from "@company-erp/shared";

const now = "2026-05-11T08:00:00.000Z";

function makeParty(overrides: Partial<PartyDto> = {}): PartyDto {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    partyCode: "SUP0001",
    partyName: "晨光贸易有限公司",
    partyTypes: ["supplier"],
    unifiedSocialCreditCode: "91320200MA00000001",
    primaryContactName: "张三",
    primaryContactPhone: "13800000000",
    supplyCategory: "办公物料",
    commonMaterials: "复印纸、工服",
    address: "无锡市",
    settlementNotes: "月结",
    entityType: "company",
    identityNoMasked: null,
    identityNoLast4: null,
    status: "enabled",
    remark: "常用供应商",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createFakeRepository(seed: PartyDto[] = []): PartyRepository {
  const parties = [...seed];

  return {
    async list(filters) {
      return parties.filter((party) => {
        const matchesType = filters.type ? party.partyTypes.includes(filters.type) : true;
        const matchesStatus = filters.status ? party.status === filters.status : true;
        const matchesQuery = filters.q
          ? [party.partyCode, party.partyName, party.primaryContactName, party.primaryContactPhone]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(filters.q!.toLowerCase()))
          : true;

        return matchesType && matchesStatus && matchesQuery;
      });
    },
    async getById(id) {
      return parties.find((party) => party.id === id) ?? null;
    },
    async create(input) {
      if (parties.some((party) => party.partyCode === input.partyCode)) {
        throw new PartyConflictError("partyCode");
      }

      const identityNoLast4 = input.identityNo ? input.identityNo.slice(-4) : null;
      const party = makeParty({
        id: "22222222-2222-4222-8222-222222222222",
        ...input,
        identityNoMasked: identityNoLast4 ? `**************${identityNoLast4}` : null,
        identityNoLast4,
        status: input.status ?? "enabled",
        createdAt: now,
        updatedAt: now,
      });
      parties.push(party);
      return party;
    },
    async update(id, input) {
      const index = parties.findIndex((party) => party.id === id);
      if (index === -1) return null;

      const next = { ...parties[index], ...input, updatedAt: now };
      parties[index] = next;
      return next;
    },
  };
}

describe("parties API", () => {
  it("reports parties API as unavailable when no repository is configured", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/parties" });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
  });

  it("lists parties with type, status, and text filters", async () => {
    const app = await buildApp({
      partyRepository: createFakeRepository([
        makeParty(),
        makeParty({
          id: "33333333-3333-4333-8333-333333333333",
          partyCode: "CLI0001",
          partyName: "无锡科技园服务单位",
          partyTypes: ["client"],
          status: "disabled",
        }),
      ]),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/parties?type=supplier&status=enabled&q=晨光",
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ parties: [makeParty()] });
  });

  it("returns a party detail by id", async () => {
    const party = makeParty();
    const app = await buildApp({ partyRepository: createFakeRepository([party]) });

    const response = await app.inject({ method: "GET", url: `/api/parties/${party.id}` });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ party });
  });

  it("returns 404 for a missing party", async () => {
    const app = await buildApp({ partyRepository: createFakeRepository() });

    const response = await app.inject({
      method: "GET",
      url: "/api/parties/99999999-9999-4999-8999-999999999999",
    });
    await app.close();

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "PARTY_NOT_FOUND" });
  });

  it("creates a party with default enabled status", async () => {
    const app = await buildApp({ partyRepository: createFakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/parties",
      payload: {
        partyCode: "SUB0001",
        partyName: "宜兴后勤外包有限公司",
        partyTypes: ["subcontractor"],
        primaryContactName: "王五",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      party: {
        partyCode: "SUB0001",
        partyName: "宜兴后勤外包有限公司",
        partyTypes: ["subcontractor"],
        status: "enabled",
      },
    });
  });

  it("creates individual subcontractors without exposing the full identity number", async () => {
    const app = await buildApp({ partyRepository: createFakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/parties",
      payload: {
        partyCode: "SUB-P-0001",
        partyName: "王承包",
        partyTypes: ["subcontractor"],
        entityType: "individual",
        primaryContactName: "王承包",
        primaryContactPhone: "13900000000",
        identityNo: "320205199001011234",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      party: {
        partyCode: "SUB-P-0001",
        partyTypes: ["subcontractor"],
        entityType: "individual",
        identityNoMasked: "**************1234",
        identityNoLast4: "1234",
      },
    });
    expect(JSON.stringify(response.json())).not.toContain("320205199001011234");
  });

  it("requires identity details for individual subcontractors", async () => {
    const app = await buildApp({ partyRepository: createFakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/parties",
      payload: {
        partyCode: "SUB-P-0002",
        partyName: "李承包",
        partyTypes: ["subcontractor"],
        entityType: "individual",
        primaryContactPhone: "13900000001",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json().issues).toEqual(expect.arrayContaining(["identityNo is required for individual parties"]));
  });

  it("updates party fields and status", async () => {
    const party = makeParty();
    const app = await buildApp({ partyRepository: createFakeRepository([party]) });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/parties/${party.id}`,
      payload: {
        status: "disabled",
        remark: "暂停合作",
      },
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      party: {
        id: party.id,
        status: "disabled",
        remark: "暂停合作",
      },
    });
  });

  it("rejects invalid party payloads", async () => {
    const app = await buildApp({ partyRepository: createFakeRepository() });

    const response = await app.inject({
      method: "POST",
      url: "/api/parties",
      payload: {
        partyCode: "",
        partyName: "",
        partyTypes: ["vendor"],
      },
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "PARTY_VALIDATION_FAILED" });
  });

  it("returns 409 when party code already exists", async () => {
    const app = await buildApp({ partyRepository: createFakeRepository([makeParty()]) });

    const response = await app.inject({
      method: "POST",
      url: "/api/parties",
      payload: {
        partyCode: "SUP0001",
        partyName: "重复供应商",
        partyTypes: ["supplier"],
      },
    });
    await app.close();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "PARTY_CONFLICT",
      field: "partyCode",
    });
  });
});
