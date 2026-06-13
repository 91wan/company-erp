import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError, useFormErrors } from "../src/components/ui";

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

  it("fieldProps 在有错误时给出 aria 属性，描述 id 取自 errorId", () => {
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
      "aria-describedby": result.current.errorId("a"),
    });
  });

  it("同页两个实例同名字段生成不同 error id", () => {
    function TwoInstances() {
      const first = useFormErrors<"x">();
      const second = useFormErrors<"x">();
      return (
        <>
          <span data-testid="id1">{first.errorId("x")}</span>
          <span data-testid="id2">{second.errorId("x")}</span>
        </>
      );
    }
    render(<TwoInstances />);
    expect(screen.getByTestId("id1").textContent).not.toBe(
      screen.getByTestId("id2").textContent,
    );
  });
});

function Harness({
  names,
  invalid,
}: {
  names: string[];
  invalid: string[];
}) {
  const { fieldProps, validate, formRef, errors, errorId } = useFormErrors<string>();
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        validate(
          Object.fromEntries(
            names.map((name) => [name, invalid.includes(name) ? "必填" : undefined]),
          ),
        );
      }}
    >
      {names.map((name) => (
        <div key={name}>
          <input {...fieldProps(name)} aria-label={name} />
          <FieldError name={name} errors={errors} errorId={errorId} />
        </div>
      ))}
      <button type="submit">提交</button>
    </form>
  );
}

describe("useFormErrors 聚焦", () => {
  it("提交后聚焦第一个无效字段", () => {
    render(<Harness names={["a", "b", "c"]} invalid={["b", "c"]} />);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(document.activeElement).toBe(screen.getByLabelText("b"));
  });

  it("字段名含点号或方括号时也能聚焦", () => {
    render(<Harness names={["lines[0].quantity"]} invalid={["lines[0].quantity"]} />);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(document.activeElement).toBe(screen.getByLabelText("lines[0].quantity"));
  });

  it("同页多表单只聚焦当前 form 内字段", () => {
    render(
      <>
        <Harness names={["a"]} invalid={[]} />
        <Harness names={["a"]} invalid={["a"]} />
      </>,
    );
    const inputs = screen.getAllByLabelText("a");
    // 第二个表单（含无效字段）提交，应聚焦它自己的 a，而非第一个表单的 a。
    fireEvent.click(screen.getAllByRole("button", { name: "提交" })[1]!);
    expect(document.activeElement).toBe(inputs[1]);
    expect(document.activeElement).not.toBe(inputs[0]);
  });
});
