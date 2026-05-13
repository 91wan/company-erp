import type { PrismaClient } from "@prisma/client";
import type { AppConfigDto, UpdateAppConfigInput } from "@company-erp/shared";
import { DEFAULT_COMPANY_NAME, appConfigRecordKey, type AppConfigRepository } from "./appConfig.js";

function toDto(value: string | null | undefined): AppConfigDto {
  return { companyName: value?.trim() || DEFAULT_COMPANY_NAME };
}

export function createPrismaAppConfigRepository(prisma: PrismaClient): AppConfigRepository {
  return {
    async get() {
      const record = await prisma.appConfig.findUnique({ where: { key: appConfigRecordKey() } });
      return toDto(record?.value);
    },
    async update(input: UpdateAppConfigInput) {
      const record = await prisma.appConfig.upsert({
        where: { key: appConfigRecordKey() },
        create: {
          key: appConfigRecordKey(),
          value: input.companyName ?? DEFAULT_COMPANY_NAME,
        },
        update: {
          value: input.companyName ?? DEFAULT_COMPANY_NAME,
        },
      });
      return toDto(record.value);
    },
  };
}
