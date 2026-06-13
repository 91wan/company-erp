import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFormErrors } from "../src/components/ui";

describe("useFormErrors", () => {
  it("validate 只保留有值的错误并返回是否全部通过", () => {
    const { result } = renderHook(() => useFormErrors<"a" | "b">());

    let valid = true;
    act(() => {
      valid = result.current.validate({ a: "缺 a", b: undefined });
    });
    expect(valid).toBe(false);
    expect(result.current.errors).toEqual({ a: "缺 a" });

    act(() => {
      valid = result.current.validate({ a: undefined, b: undefined });
    });
    expect(valid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("clearError 移除单个字段错误", () => {
    const { result } = renderHook(() => useFormErrors<"a" | "b">());

    act(() => {
      result.current.validate({ a: "缺 a", b: "缺 b" });
    });
    act(() => {
      result.current.clearError("a");
    });
    expect(result.current.errors).toEqual({ b: "缺 b" });
  });

  it("fieldProps 在有错误时给出 aria 属性", () => {
    const { result } = renderHook(() => useFormErrors<"a">());

    expect(result.current.fieldProps("a")).toEqual({
      name: "a",
      "aria-invalid": undefined,
      "aria-describedby": undefined,
    });

    act(() => {
      result.current.validate({ a: "缺 a" });
    });
    expect(result.current.fieldProps("a")).toEqual({
      name: "a",
      "aria-invalid": true,
      "aria-describedby": "field-error-a",
    });
  });
});
