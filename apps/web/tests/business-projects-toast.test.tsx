import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusinessProjectsWorkspace } from "../src/components/BusinessProjectsWorkspace";
import { ToastProvider } from "../src/components/ui";
import { businessProject, businessProjectSummary, employee } from "./appTestHelpers";

describe("BusinessProjectsWorkspace 保存反馈", () => {
  it("保存成功后弹出 toast 确认", async () => {
    const created = {
      ...businessProject,
      id: "88888888-8888-4888-8888-888888888888",
      projectCode: "BP-YZ-CK-002",
      projectName: "扬中中央厨房二期",
    };

    render(
      <ToastProvider>
        <BusinessProjectsWorkspace
          loadBusinessProjects={() => Promise.resolve([businessProject])}
          loadEmployees={() => Promise.resolve([employee])}
          loadInvestmentSummary={() => Promise.resolve(businessProjectSummary)}
          createBusinessProject={() => Promise.resolve(created)}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "新增业务项目" }));
    fireEvent.change(screen.getByLabelText("项目编码"), {
      target: { value: "BP-YZ-CK-002" },
    });
    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "扬中中央厨房二期" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存业务项目" }));

    expect(await screen.findByRole("status")).toHaveTextContent("业务项目已保存");
  });
});
