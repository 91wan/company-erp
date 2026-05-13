import type { AppVersionDto } from "@company-erp/shared";

const UNKNOWN_VERSION_VALUE = "unknown";

function nonEmptyEnv(name: string): string {
  const value = process.env[name]?.trim();
  return value || UNKNOWN_VERSION_VALUE;
}

function shortCommitSha(commitSha: string): string {
  return commitSha === UNKNOWN_VERSION_VALUE ? UNKNOWN_VERSION_VALUE : commitSha.slice(0, 7);
}

export function getAppVersion(): AppVersionDto {
  const commitSha = nonEmptyEnv("APP_COMMIT_SHA");
  return {
    packageVersion: nonEmptyEnv("APP_PACKAGE_VERSION"),
    commitSha,
    shortCommitSha: shortCommitSha(commitSha),
    buildTime: nonEmptyEnv("APP_BUILD_TIME"),
    deployedAt: nonEmptyEnv("APP_DEPLOYED_AT"),
    environment: nonEmptyEnv("APP_ENVIRONMENT"),
  };
}
