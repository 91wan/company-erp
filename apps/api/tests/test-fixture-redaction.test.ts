import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixtureFiles = [
  "apps/api/tests/certificates-routes.test.ts",
  "apps/api/tests/contracts-routes.test.ts",
  "apps/api/tests/project-sites-routes.test.ts",
];

describe("test fixture path redaction", () => {
  it("keeps NAS-like absolute attachment paths out of ordinary route fixtures", () => {
    for (const file of fixtureFiles) {
      const source = readFileSync(join(process.cwd(), "..", "..", file), "utf8");
      expect(source).not.toContain("/volume1/company-erp/attachments");
      expect(source).toContain("legacy-fixtures/");
    }
  });
});
