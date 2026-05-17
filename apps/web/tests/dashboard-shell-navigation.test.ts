import { describe, expect, it } from "vitest";
import { adminUser, externalProjectSiteUser, viewerUser } from "./appTestHelpers";
import {
  buildVisibleNavigationGroups,
  isProjectSiteScopedUser,
  isReadOnlyUser,
  resolveNavigationSelection,
  workspaceForExternalPortalSection,
} from "../src/components/shell/dashboardShellNavigation";

describe("dashboardShellNavigation", () => {
  it("keeps headquarters navigation grouped by readable permission areas", () => {
    const groups = buildVisibleNavigationGroups(adminUser);
    const labels = groups.flatMap((group) => group.items.map((item) => item.label));

    expect(groups.map((group) => group.label)).toEqual(["工作台", "经营业务", "合规与人员", "基础与系统"]);
    expect(labels).toEqual(expect.arrayContaining(["总览", "采购", "库存", "项目点", "证照资质", "人员权限", "Excel 导入"]));
  });

  it("keeps external project-site navigation limited to portal entries", () => {
    const groups = buildVisibleNavigationGroups(externalProjectSiteUser);
    const labels = groups.flatMap((group) => group.items.map((item) => item.label));

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("项目点门户");
    expect(labels).toEqual(["我的项目点", "物料领用", "现场人员/健康证", "食品经营许可证", "雇主责任险", "工资表"]);
    expect(labels).not.toContain("系统设置");
  });

  it("maps external portal sections to their real workspace", () => {
    expect(workspaceForExternalPortalSection("overview")).toBe("项目点");
    expect(workspaceForExternalPortalSection("usage")).toBe("项目点");
    expect(workspaceForExternalPortalSection("insurance")).toBe("项目点");
    expect(workspaceForExternalPortalSection("payroll")).toBe("项目点");
    expect(workspaceForExternalPortalSection("rosterHealth")).toBe("证照资质");
    expect(workspaceForExternalPortalSection("foodLicense")).toBe("证照资质");
  });

  it("resolves sidebar item selection without losing external portal sections", () => {
    const groups = buildVisibleNavigationGroups(externalProjectSiteUser);
    const foodLicense = groups[0].items.find((item) => item.portalSection === "foodLicense");

    expect(foodLicense).toBeDefined();
    expect(resolveNavigationSelection(foodLicense!)).toEqual({
      workspace: "证照资质",
      portalSection: "foodLicense",
    });
  });

  it("classifies scoped and read-only users for the shell", () => {
    expect(isProjectSiteScopedUser(externalProjectSiteUser)).toBe(true);
    expect(isProjectSiteScopedUser(adminUser)).toBe(false);
    expect(isReadOnlyUser(viewerUser)).toBe(true);
    expect(isReadOnlyUser(adminUser)).toBe(false);
  });
});
