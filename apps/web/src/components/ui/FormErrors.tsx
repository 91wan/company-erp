import { useCallback, useId, useRef, useState } from "react";

export type FieldErrorMap<K extends string = string> = Partial<Record<K, string | undefined>>;

/**
 * 客户端字段校验：管理字段错误、给 input/select 提供 aria 属性、提交时聚焦首个无效字段。
 * 服务端 400 仍由各表单顶部 banner 处理（issues 是纯文案、不带字段路径，无法映射到字段）。
 */
export function useFormErrors<K extends string = string>() {
  const idPrefix = useId();
  const [errors, setErrors] = useState<FieldErrorMap<K>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // 每个 hook 实例独立前缀，避免同页多表单同名字段的 error id 冲突。
  const errorId = useCallback((name: K) => `${idPrefix}field-error-${name}`, [idPrefix]);

  const fieldProps = useCallback(
    (name: K) => ({
      name,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? errorId(name) : undefined,
    }),
    [errors, errorId],
  );

  const clearError = useCallback((name: K) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  /** 应用一次校验结果：只保留有值的项作为错误，聚焦首个无效字段，返回是否全部通过。 */
  const validate = useCallback((candidate: FieldErrorMap<K>): boolean => {
    const next: FieldErrorMap<K> = {};
    for (const key of Object.keys(candidate) as K[]) {
      if (candidate[key]) next[key] = candidate[key];
    }
    setErrors(next);
    const firstInvalid = (Object.keys(next) as K[])[0];
    if (firstInvalid) {
      // 用 form.elements.namedItem 按字段名取控件，避免 CSS selector 拼接字段名
      // （字段名含点号/方括号时 querySelector 会出错）；只在当前 form 内查找。
      focusControl(formRef.current?.elements.namedItem(firstInvalid) ?? null);
    }
    return firstInvalid === undefined;
  }, []);

  return { errors, setErrors, errorId, fieldProps, clearError, validate, formRef };
}

function focusControl(control: Element | RadioNodeList | null) {
  if (control instanceof HTMLElement) {
    control.focus();
    return;
  }
  if (typeof RadioNodeList !== "undefined" && control instanceof RadioNodeList) {
    for (const node of Array.from(control)) {
      if (node instanceof HTMLElement) {
        node.focus();
        return;
      }
    }
  }
}

export function FieldError<K extends string>({
  name,
  errors,
  errorId,
  id,
}: {
  name: K;
  errors: FieldErrorMap<K>;
  errorId?: (name: K) => string;
  id?: string;
}) {
  const message = errors[name];
  if (!message) return null;
  const resolvedId = id ?? errorId?.(name) ?? `field-error-${name}`;
  return (
    <span id={resolvedId} role="alert" className="field-error">
      {message}
    </span>
  );
}
