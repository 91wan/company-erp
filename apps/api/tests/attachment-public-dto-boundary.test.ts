import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("attachment public DTO boundary", () => {
  it("does not expose storageKey in shared web-facing attachment DTOs", () => {
    const shared = readRepoFile("packages/shared/src/index.ts");
    const dtoMatch = shared.match(/export type AttachmentRecordDto = \{[\s\S]*?\n\};/);

    expect(dtoMatch?.[0]).toBeTruthy();
    expect(dtoMatch?.[0]).not.toContain("storageKey");
    expect(shared).not.toContain("export type CreateAttachmentRecordInput");
    expect(shared).not.toContain("export type UpdateAttachmentRecordInput");
  });
});
