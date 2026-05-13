import type { AppConfigDto, UpdateAppConfigInput } from "@company-erp/shared";

export const DEFAULT_COMPANY_NAME = "Company ERP";
const COMPANY_NAME_KEY = "companyName";

export class AppConfigValidationError extends Error {
  constructor(readonly issues: string[]) {
    super("App config validation failed");
  }
}

export type AppConfigRepository = {
  get(): Promise<AppConfigDto>;
  update(input: UpdateAppConfigInput): Promise<AppConfigDto>;
};

export function normalizeAppConfigInput(payload: unknown): UpdateAppConfigInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppConfigValidationError(["Payload must be an object"]);
  }

  const input = payload as Record<string, unknown>;
  const companyName = typeof input.companyName === "string" ? input.companyName.trim() : "";
  if (!companyName) {
    throw new AppConfigValidationError(["companyName is required"]);
  }
  if (companyName.length > 80) {
    throw new AppConfigValidationError(["companyName must be 80 characters or fewer"]);
  }

  return { companyName };
}

export function createMemoryAppConfigRepository(seed: AppConfigDto = { companyName: DEFAULT_COMPANY_NAME }): AppConfigRepository {
  let appConfig = { ...seed };

  return {
    async get() {
      return appConfig;
    },
    async update(input) {
      appConfig = {
        companyName: input.companyName ?? appConfig.companyName,
      };
      return appConfig;
    },
  };
}

export function appConfigRecordKey(): string {
  return COMPANY_NAME_KEY;
}
