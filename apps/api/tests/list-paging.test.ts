import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, normalizeListPaging } from "../src/listPaging";

describe("normalizeListPaging", () => {
  it("applies the default cap when limit/offset are absent", () => {
    expect(normalizeListPaging({})).toEqual({ limit: DEFAULT_LIST_LIMIT, offset: 0 });
  });

  it("parses numeric and string limit/offset", () => {
    expect(normalizeListPaging({ limit: 50, offset: 100 })).toEqual({ limit: 50, offset: 100 });
    expect(normalizeListPaging({ limit: "50", offset: "100" })).toEqual({ limit: 50, offset: 100 });
  });

  it("clamps an over-large limit to MAX_LIST_LIMIT", () => {
    expect(normalizeListPaging({ limit: 1000000 }).limit).toBe(MAX_LIST_LIMIT);
  });

  it("floors limit at 1 and offset at 0, ignoring invalid values", () => {
    expect(normalizeListPaging({ limit: 0 }).limit).toBe(1);
    expect(normalizeListPaging({ limit: -5 }).limit).toBe(1);
    expect(normalizeListPaging({ offset: -5 }).offset).toBe(0);
    expect(normalizeListPaging({ limit: "abc", offset: "x" })).toEqual({ limit: DEFAULT_LIST_LIMIT, offset: 0 });
  });
});
