import type { ReactNode } from "react";

export function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="panel-header people-panel-title">
      <h3>
        {icon}
        {title}
      </h3>
    </div>
  );
}

export function ResponsiveTable({
  headers,
  rows,
  onRowClick,
}: {
  headers: string[];
  rows: ReactNode[][];
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? "clickable-row" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(rowIndex);
                      }
                    }
                  : undefined
              }
            >
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StateMessage({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="party-state">
      {icon}
      {text}
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "green" | "orange" | "gray" | "red"; children: ReactNode }) {
  const className =
    tone === "green"
      ? "status-badge green"
      : tone === "orange"
        ? "status-badge amber"
        : tone === "red"
          ? "status-badge red"
          : "status-badge gray";
  return <span className={className}>{children}</span>;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
