import { describe, expect, it, vi } from "vitest";
import {
  bootstrapTrialData,
  TRIAL_DEPARTMENTS,
  TRIAL_HEADQUARTERS_WAREHOUSE,
  TRIAL_OPERATOR_PARTY,
} from "../src/trialData.js";

describe("trial data bootstrap", () => {
  it("upserts the minimum pilot master data idempotently", async () => {
    const prisma = {
      party: { upsert: vi.fn(async () => ({})) },
      warehouse: { upsert: vi.fn(async () => ({})) },
      department: { upsert: vi.fn(async () => ({})) },
    };

    const result = await bootstrapTrialData(prisma as never);

    expect(prisma.party.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { partyCode: TRIAL_OPERATOR_PARTY.partyCode },
        create: TRIAL_OPERATOR_PARTY,
      }),
    );
    expect(prisma.warehouse.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { warehouseCode: TRIAL_HEADQUARTERS_WAREHOUSE.warehouseCode },
        create: expect.objectContaining({ warehouseName: "无锡总部仓库" }),
        update: expect.objectContaining({ warehouseName: "无锡总部仓库" }),
      }),
    );
    expect(prisma.department.upsert).toHaveBeenCalledTimes(TRIAL_DEPARTMENTS.length);
    expect(result).toEqual({
      operatorPartyCode: "OUR-COMPANY",
      headquartersWarehouseCode: "WH-WX-HQ",
      departmentCodes: TRIAL_DEPARTMENTS.map((department) => department.departmentCode),
    });
  });
});
