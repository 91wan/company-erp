import { useState } from "react";
import type { ReactNode } from "react";

export function ConfirmAction({
  actionLabel,
  confirmationText,
  confirmLabel,
  cancelLabel = "取消",
  danger = false,
  disabled = false,
  pending = false,
  error,
  confirming,
  actionButtonType = "button",
  confirmButtonType = "button",
  onRequestConfirm,
  onCancel,
  onConfirm,
}: {
  actionLabel: ReactNode;
  confirmationText: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  pending?: boolean;
  error?: string;
  confirming?: boolean;
  actionButtonType?: "button" | "submit";
  confirmButtonType?: "button" | "submit";
  onRequestConfirm?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
}) {
  const [internalConfirming, setInternalConfirming] = useState(false);
  const isControlled = confirming !== undefined;
  const isConfirming = isControlled ? confirming : internalConfirming;

  const requestConfirm = () => {
    if (disabled || pending) return;
    if (isControlled) {
      onRequestConfirm?.();
      return;
    }
    setInternalConfirming(true);
  };

  const cancelConfirm = () => {
    if (pending) return;
    if (!isControlled) {
      setInternalConfirming(false);
    }
    onCancel?.();
  };

  const confirm = () => {
    if (disabled || pending) return;
    onConfirm();
  };

  return (
    <span className="ui-confirm-action">
      {!isConfirming ? (
        <button
          type={actionButtonType}
          className={danger ? "table-action danger" : "table-action"}
          disabled={disabled || pending}
          onClick={requestConfirm}
        >
          {actionLabel}
        </button>
      ) : (
        <span className="inline-confirm-actions" aria-label={typeof confirmationText === "string" ? confirmationText : undefined}>
          <span>{confirmationText}</span>
          <button
            type={confirmButtonType}
            className={danger ? "table-action danger" : "table-action"}
            disabled={disabled || pending}
            onClick={confirm}
          >
            {pending ? "处理中..." : confirmLabel}
          </button>
          <button type="button" className="table-action" disabled={pending} onClick={cancelConfirm}>
            {cancelLabel}
          </button>
        </span>
      )}
      {error ? <span className="form-error">{error}</span> : null}
    </span>
  );
}
