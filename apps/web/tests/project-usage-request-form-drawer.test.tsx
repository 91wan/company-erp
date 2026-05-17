import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { material, projectSite, warehouse } from "./appTestHelpers";
import {
  ProjectUsageRequestFormDrawer,
  type ProjectUsageRequestFormState,
} from "../src/components/project-sites/ProjectUsageRequestFormDrawer";

function createForm(overrides: Partial<ProjectUsageRequestFormState> = {}): ProjectUsageRequestFormState {
  return {
    requestNo: "",
    requestDate: "2026-05-17",
    projectSiteId: "",
    warehouseId: "",
    materialId: "",
    requestedQuantity: "",
    unit: "",
    purpose: "",
    requestedBy: "",
    expectedDate: "",
    ...overrides,
  };
}

const materialOption = {
  id: material.id,
  materialCode: material.materialCode,
  materialName: material.materialName,
  specification: material.specification,
  unit: material.projectSiteSaleUnit ?? material.baseUnit,
};

describe("ProjectUsageRequestFormDrawer", () => {
  it("lets headquarters users choose project site, warehouse, and material", () => {
    const onChange = vi.fn();
    const onMaterialChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <ProjectUsageRequestFormDrawer
        open
        canCreateUsage
        usageOnly={false}
        form={createForm()}
        sites={[projectSite]}
        warehouses={[warehouse]}
        materials={[materialOption]}
        masterStatus="ready"
        submitState="idle"
        submitError=""
        onChange={onChange}
        onMaterialChange={onMaterialChange}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("项目点"), { target: { value: projectSite.id } });
    fireEvent.change(screen.getByLabelText("仓库"), { target: { value: warehouse.id } });
    fireEvent.change(screen.getByLabelText("物料"), { target: { value: material.id } });
    fireEvent.click(screen.getByRole("button", { name: "保存领用申请" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ projectSiteId: projectSite.id }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: warehouse.id }));
    expect(onMaterialChange).toHaveBeenCalledWith(material.id);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps external project-site request form scoped to material, quantity, purpose, and expected date", () => {
    render(
      <ProjectUsageRequestFormDrawer
        open
        canCreateUsage
        usageOnly
        form={createForm()}
        sites={[projectSite]}
        warehouses={[warehouse]}
        materials={[materialOption]}
        masterStatus="ready"
        submitState="idle"
        submitError=""
        onChange={vi.fn()}
        onMaterialChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("物料")).toBeInTheDocument();
    expect(screen.getByLabelText("申请数量")).toBeInTheDocument();
    expect(screen.getByLabelText("用途")).toBeInTheDocument();
    expect(screen.getByLabelText("期望日期")).toBeInTheDocument();
    expect(screen.queryByLabelText("项目点")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("仓库")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("申请人")).not.toBeInTheDocument();
    expect(screen.queryByText(projectSite.siteName)).not.toBeInTheDocument();
    expect(screen.queryByText(warehouse.warehouseName)).not.toBeInTheDocument();
    expect(screen.queryByText(/成本价|采购价|库存金额/)).not.toBeInTheDocument();
  });
});
