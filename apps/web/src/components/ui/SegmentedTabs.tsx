import type { ReactNode } from "react";

export type TabItem<T extends string> = {
  key: T;
  label: string;
  badge?: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
};

export function SegmentedTabs<T extends string>({
  items,
  activeKey,
  onChange,
  ariaLabel = "页面分区",
}: {
  items: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="ui-segmented-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={activeKey === item.key}
          aria-disabled={item.disabled || undefined}
          title={item.disabled ? item.disabledReason : undefined}
          disabled={item.disabled}
          onClick={() => {
            if (!item.disabled) onChange(item.key);
          }}
        >
          <span>{item.label}</span>
          {item.badge ? <span className="ui-tab-badge">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
