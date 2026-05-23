import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImportJobDto, ImportJobRowDto, ImportJobSummaryDto } from "@company-erp/shared";
import { ExcelImportWorkspace } from "../src/components/excel-import/ExcelImportWorkspace";

const baseRow: ImportJobRowDto = {
  id: "row-1",
  rowNumber: 2,
  rawData: {},
  normalizedData: null,
  issues: [],
  status: "imported",
  targetRecordType: null,
  targetRecordId: null,
  createdAt: "2026-05-23T00:00:00.000Z",
  updatedAt: "2026-05-23T00:00:00.000Z",
};

function job(overrides: Partial<ImportJobDto>): ImportJobDto {
  const rows = overrides.rows ?? [];
  return {
    id: overrides.id ?? "job-1",
    templateType: overrides.templateType ?? "health_certificates",
    originalFileName: overrides.originalFileName ?? "pilot.xlsx",
    fileHash: "hash",
    status: overrides.status ?? "confirmed",
    totalRows: overrides.totalRows ?? rows.length,
    validRows: overrides.validRows ?? rows.length,
    warningRows: overrides.warningRows ?? 0,
    errorRows: overrides.errorRows ?? 0,
    skippedRows: overrides.skippedRows ?? 0,
    importedRows: overrides.importedRows ?? rows.length,
    createdAt: overrides.createdAt ?? "2026-05-23T00:00:00.000Z",
    confirmedAt: overrides.confirmedAt ?? "2026-05-23T00:05:00.000Z",
    rows,
  };
}

function summary(importJob: ImportJobDto): ImportJobSummaryDto {
  const { rows: _rows, ...rest } = importJob;
  return rest;
}

describe("ImportPilotReviewPanel", () => {
  it("summarizes recent confirmed imports and navigates to business review tabs", async () => {
    const healthJob = job({
      id: "health-job",
      templateType: "health_certificates",
      rows: [
        { ...baseRow, id: "health-site", targetRecordType: "certificate", targetRecordId: "cert-site", normalizedData: { healthCertificateOwnerTypeLabel: "项目点健康证", expiryDate: "2026-05-25" } },
        { ...baseRow, id: "health-employee", targetRecordType: "certificate", targetRecordId: "cert-emp", normalizedData: { healthCertificateOwnerTypeLabel: "公司健康证", expiryDate: "2026-04-01" } },
      ],
    });
    const contractJob = job({
      id: "contract-job",
      templateType: "contracts",
      rows: [{ ...baseRow, id: "contract-row", targetRecordType: "contract", targetRecordId: "contract-1", normalizedData: { endDate: "2026-05-20" } }],
    });
    const errorJob = job({
      id: "error-job",
      templateType: "materials",
      status: "previewed",
      confirmedAt: null,
      errorRows: 1,
      validRows: 0,
      importedRows: 0,
      rows: [],
    });
    const onNavigate = vi.fn();

    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([summary(healthJob), summary(contractJob), summary(errorJob)])}
        loadImportJobDetail={(id) => Promise.resolve(id === "health-job" ? healthJob : id === "contract-job" ? contractJob : errorJob)}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "试点复核" }));

    expect(await screen.findByText("健康证复核")).toBeInTheDocument();
    expect(screen.getByText("最近导入 2 条")).toBeInTheDocument();
    expect(screen.getByText("项目点健康证 1 条")).toBeInTheDocument();
    expect(screen.getByText("公司健康证 1 条")).toBeInTheDocument();
    expect(screen.getByText("合同复核")).toBeInTheDocument();
    expect(screen.getByText("已到期 1 条")).toBeInTheDocument();
    expect(screen.getByText("错误/警告复核")).toBeInTheDocument();
    expect(screen.getByText("错误批次 1 个")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "去证照健康证" }));
    expect(onNavigate).toHaveBeenCalledWith({ workspace: "证照资质", tab: "health" });
    fireEvent.click(screen.getByRole("button", { name: "去合同风险" }));
    expect(onNavigate).toHaveBeenCalledWith({ workspace: "合同", tab: "risk" });
  });

  it("shows an empty state when there is no pilot review data", async () => {
    render(<ExcelImportWorkspace loadImportJobs={() => Promise.resolve([])} />);

    fireEvent.click(await screen.findByRole("tab", { name: "试点复核" }));

    expect(await screen.findByText("暂无导入后复核任务")).toBeInTheDocument();
  });
});
