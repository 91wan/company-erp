import { useCallback, useRef, useState } from "react";

export type FieldErrorMap<K extends string = string> = Partial<Record<K, string | undefined>>;

/**
 * 客户端字段校验：管理字段错误、给 input/select 提供 aria 属性、提交时聚焦首个无效字段。
 * 服务端 400 仍由各表单顶部 banner 处理（issues 是纯文案、不带字段路径，无法映射到字段）。
 */
export function useFormErrors<K extends string = string>() {
  const [errors, setErrors] = useState<FieldErrorMap<K>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const fieldProps = useCallback(
    (name: K) => ({
      name,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? `field-error-${name}` : undefined,
    }),
    [errors],
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
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    }
    return firstInvalid === undefined;
  }, []);

  return { errors, setErrors, fieldProps, clearError, validate, formRef };
}

export function FieldError<K extends string>({
  name,
  errors,
}: {
  name: K;
  errors: FieldErrorMap<K>;
}) {
  const message = errors[name];
  if (!message) return null;
  return (
    <span id={`field-error-${name}`} role="alert" className="field-error">
      {message}
    </span>
  );
}
