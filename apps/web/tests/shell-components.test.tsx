import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { navigationGroups } from "../src/dashboardData";
import { Sidebar } from "../src/components/shell/Sidebar";
import { TopBar } from "../src/components/shell/TopBar";
import { adminUser } from "./appTestHelpers";

describe("Shell component primitives", () => {
  it("renders grouped sidebar navigation and settings action", () => {
    const onSelectItem = vi.fn();
    const onSelectSettings = vi.fn();
    const overviewItem = navigationGroups[0].items[0];

    render(
      <Sidebar
        companyName="无锡餐服 ERP"
        activeWorkspace="总览"
        groups={[{ label: "工作台", items: [overviewItem] }]}
        externalMode={false}
        activePortalSection="overview"
        onSelectItem={onSelectItem}
        onSelectSettings={onSelectSettings}
      />,
    );

    expect(screen.getByRole("heading", { name: "无锡餐服 ERP" })).toBeInTheDocument();
    expect(screen.getByText("工作台")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^总览$/ })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: /^总览$/ }));
    expect(onSelectItem).toHaveBeenCalledWith(overviewItem);

    fireEvent.click(screen.getByRole("button", { name: /^系统设置$/ }));
    expect(onSelectSettings).toHaveBeenCalledTimes(1);
  });

  it("renders top bar user context and logout action", () => {
    const onLogout = vi.fn();

    render(<TopBar currentUser={adminUser} onLogout={onLogout} />);

    expect(screen.getByLabelText("工作台说明")).toHaveTextContent("角色工作台");
    expect(screen.getByText("数据库已连接")).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
