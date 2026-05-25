import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AppVersionDto } from "@company-erp/shared";
import { ExcelImportWorkspace } from "../src/components/excel-import/ExcelImportWorkspace";

function version(environment: string): AppVersionDto {
  return {
    packageVersion: "0.1.0",
    commitSha: "abcdef123456",
    shortCommitSha: "abcdef1",
    buildTime: "2026-05-25T00:00:00.000Z",
    deployedAt: "2026-05-25T00:00:00.000Z",
    environment,
  };
}

describe("ExcelImportWorkspace production import notice", () => {
  it("shows a controlled import notice in production", async () => {
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        loadAppVersion={() => Promise.resolve(version("production"))}
      />,
    );

    expect(await screen.findByText("正式上线后，Excel 导入仅用于受控补录；不得用于覆盖式更新。批量导入前请完成审批和备份。")).toBeInTheDocument();
  });

  it("shows a limited trial import notice in nas environment", async () => {
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        loadAppVersion={() => Promise.resolve(version("nas"))}
      />,
    );

    expect(await screen.findByText("NAS 试点环境：请先使用少量项目点试导入，不要直接导入全量真实数据。")).toBeInTheDocument();
  });

  it("does not show go-live import notices in local development", async () => {
    render(
      <ExcelImportWorkspace
        loadImportJobs={() => Promise.resolve([])}
        loadAppVersion={() => Promise.resolve(version("local"))}
      />,
    );

    expect(await screen.findByText("暂无导入批次")).toBeInTheDocument();
    expect(screen.queryByText(/正式上线后，Excel 导入仅用于受控补录/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NAS 试点环境/)).not.toBeInTheDocument();
  });
});
