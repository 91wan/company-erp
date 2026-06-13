import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ImportJobDto } from "@company-erp/shared";
import { ExcelImportWorkspace } from "../src/components/excel-import/ExcelImportWorkspace";
import { ToastProvider } from "../src/components/ui";
import { importJob } from "./appTestHelpers";

describe("ExcelImportWorkspace 操作反馈", () => {
  it("预览与确认导入分别弹出按动作措辞的 toast", async () => {
    const confirmedJob: ImportJobDto = {
      ...importJob,
      status: "confirmed",
      rows: importJob.rows.map((row) =>
        row.status === "valid" ? { ...row, status: "imported" as const } : row,
      ),
    };

    render(
      <ToastProvider>
        <ExcelImportWorkspace
          loadImportJobs={() => Promise.resolve([])}
          previewImportJob={() => Promise.resolve(importJob)}
          confirmImportJob={() => Promise.resolve(confirmedJob)}
        />
      </ToastProvider>,
    );

    await screen.findAllByText("暂无导入批次");
    fireEvent.change(screen.getByLabelText("Excel 文件"), {
      target: {
        files: [
          new File(["xlsx"], "suppliers.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入预检" }));

    expect(await screen.findByText("导入预览已生成")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));
    fireEvent.click(await screen.findByRole("button", { name: "确定导入" }));

    expect(await screen.findByText("导入已确认写入")).toBeInTheDocument();
  });
});
