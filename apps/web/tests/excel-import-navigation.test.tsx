/**
 * P0-1: buildNavigationIntent produces entityId + correct tab.
 * P0-5: ImportJobDetailDrawer displays batch info and triggers actions.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImportJobDto, ImportJobRowDto } from "@company-erp/shared";
import { importJob, ExcelImportWorkspace } from "./appTestHelpers";

// ---------------------------------------------------------------------------
// P0-1: navigation intent helpers tested via the rendered 查看 button
// ---------------------------------------------------------------------------

const baseRow: ImportJobRowDto = {
  id: "row-1",
  rowNumber: 2,
  rawData: {},
  normalizedData: null,
  issues: [],
  status: "imported",
  targetRecordType: "party",
  targetRecordId: "party-nav-001",
  createdAt: "2026-05-11T12:00:00.000Z",
  updatedAt: "2026-05-11T12:00:00.000Z",
};

const confirmedJob: ImportJobDto = {
  ...importJob,
  status: "confirmed",
  importedRows: 1,
  confirmedAt: "2026-05-11T13:00:00.000Z",
  rows: [baseRow],
};

describe("P0-1: navigationIntent with entityId + tab", () => {
  it("party imported row — 查看 passes workspace 基础资料 and entityId", async () => {
    const navigate = vi.fn();
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([confirmedJob])}
        loadImportJobDetail={() => Promise.resolve(confirmedJob)}
        onNavigate={navigate}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    const btn = await screen.findByRole("button", { name: /查看/ });
    fireEvent.click(btn);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: "基础资料", entityId: "party-nav-001" }),
    );
  });

  it("certificate imported row — 查看 passes workspace 证照资质 + health tab", async () => {
    const navigate = vi.fn();
    const certJob: ImportJobDto = {
      ...confirmedJob,
      rows: [{
        ...baseRow,
        targetRecordType: "certificate",
        targetRecordId: "cert-001",
        normalizedData: { certificateType: "person_health_cert" },
      }],
    };
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([certJob])}
        loadImportJobDetail={() => Promise.resolve(certJob)}
        onNavigate={navigate}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    const btn = await screen.findByRole("button", { name: /查看/ });
    fireEvent.click(btn);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: "证照资质", tab: "health", entityId: "cert-001" }),
    );
  });

  it("material imported row — 查看 passes workspace 基础资料 + tab materials", async () => {
    const navigate = vi.fn();
    const matJob: ImportJobDto = {
      ...confirmedJob,
      rows: [{ ...baseRow, targetRecordType: "material", targetRecordId: "mat-001", normalizedData: null }],
    };
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([matJob])}
        loadImportJobDetail={() => Promise.resolve(matJob)}
        onNavigate={navigate}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    const btn = await screen.findByRole("button", { name: /查看/ });
    fireEvent.click(btn);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: "基础资料", tab: "materials", entityId: "mat-001" }),
    );
  });

  it("skipped/error rows do not show 查看 button", async () => {
    const skippedJob: ImportJobDto = {
      ...confirmedJob,
      rows: [{ ...baseRow, status: "skipped", targetRecordType: "party", targetRecordId: "p1" }],
    };
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([skippedJob])}
        loadImportJobDetail={() => Promise.resolve(skippedJob)}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    await screen.findByText("已跳过：重复记录");
    expect(screen.queryByRole("button", { name: /查看/ })).not.toBeInTheDocument();
  });

  it("imported row without targetRecordId does not show 查看 button", async () => {
    const noIdJob: ImportJobDto = {
      ...confirmedJob,
      rows: [{ ...baseRow, targetRecordType: "party", targetRecordId: null }],
    };
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([noIdJob])}
        loadImportJobDetail={() => Promise.resolve(noIdJob)}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByText("suppliers.xlsx"));
    await screen.findByText("已导入：往来方台账");
    expect(screen.queryByRole("button", { name: /查看/ })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// P0-5: ImportJobDetailDrawer
// ---------------------------------------------------------------------------

describe("P0-5: ImportJobDetailDrawer", () => {
  it("batch list shows 详情 button and opens drawer with batch info", async () => {
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([confirmedJob])}
        loadImportJobDetail={() => Promise.resolve(confirmedJob)}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    const detailBtn = screen.getByRole("button", { name: "查看批次详情" });
    fireEvent.click(detailBtn);
    expect(await screen.findByText("批次详情")).toBeInTheDocument();
    expect(screen.getByText("suppliers.xlsx")).toBeInTheDocument();
    expect(screen.getByText("操作人记录请到审计日志查看", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("文件哈希")).not.toBeInTheDocument();
    expect(screen.queryByText(confirmedJob.fileHash)).not.toBeInTheDocument();
  });

  it("read-only user sees 详情 but not 继续确认导入", async () => {
    render(
      <ExcelImportWorkspace
        canManage={false}
        loadImportJobs={() => Promise.resolve([{ ...confirmedJob, status: "previewed" as const, errorRows: 0 }])}
        loadImportJobDetail={() => Promise.resolve({ ...confirmedJob, status: "previewed" as const, errorRows: 0 })}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByRole("button", { name: "查看批次详情" }));
    expect(await screen.findByText("批次详情")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /继续确认导入/ })).not.toBeInTheDocument();
  });

  it("admin with previewed + no-error job sees 继续确认导入 in drawer", async () => {
    const previewedJob: ImportJobDto = {
      ...importJob,
      status: "previewed",
      errorRows: 0,
      rows: [{ ...baseRow, status: "valid", targetRecordType: null, targetRecordId: null }],
    };
    render(
      <ExcelImportWorkspace
        canManage={true}
        loadImportJobs={() => Promise.resolve([previewedJob])}
        loadImportJobDetail={() => Promise.resolve(previewedJob)}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "导入批次" }));
    await screen.findByText("suppliers.xlsx");
    fireEvent.click(screen.getByRole("button", { name: "查看批次详情" }));
    expect(await screen.findByRole("button", { name: /继续确认导入/ })).toBeInTheDocument();
  });
});
