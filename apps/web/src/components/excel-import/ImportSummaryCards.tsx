import { SummaryCard } from "../ui";
import type { ExcelImportController } from "./useExcelImportController";

export function ImportSummaryCards({ model }: { model: ExcelImportController }) {
  const { summary } = model;
  return (
    <div className="summary-grid" aria-label="导入摘要">
      <SummaryCard label="总行数" value={summary.total} detail="当前批次行数" tone="info" />
      <SummaryCard label="可导入" value={summary.valid + summary.warning} detail="包含警告行" tone="success" />
      <SummaryCard label="错误" value={summary.error} detail="需修正后才能确认" tone={summary.error > 0 ? "danger" : "success"} />
      <SummaryCard label="已跳过" value={summary.skipped} detail="重复编码默认跳过" tone="warning" />
      <SummaryCard label="已导入" value={summary.imported} detail="确认后写入成功" tone="neutral" />
    </div>
  );
}
