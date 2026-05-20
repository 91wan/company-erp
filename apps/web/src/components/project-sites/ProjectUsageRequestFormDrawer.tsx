import { ClipboardList, Save } from "lucide-react";
import type { FormEvent } from "react";
import type { ProjectSiteDto, ProjectUsageOptionMaterialDto } from "@company-erp/shared";
import { DrawerFormHeader, FormDrawer } from "../ui";

export type ProjectUsageRequestFormState = {
  requestNo: string;
  requestDate: string;
  projectSiteId: string;
  warehouseId: string;
  materialId: string;
  requestedQuantity: string;
  unit: string;
  purpose: string;
  requestedBy: string;
  expectedDate: string;
};

type UsageWarehouseOption = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

export function ProjectUsageRequestFormDrawer({
  open,
  canCreateUsage,
  usageOnly,
  form,
  sites,
  warehouses,
  materials,
  masterStatus,
  submitState,
  submitError,
  onChange,
  onMaterialChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canCreateUsage: boolean;
  usageOnly: boolean;
  form: ProjectUsageRequestFormState;
  sites: ProjectSiteDto[];
  warehouses: UsageWarehouseOption[];
  materials: ProjectUsageOptionMaterialDto[];
  masterStatus: "loading" | "ready" | "error";
  submitState: "idle" | "saving" | "error";
  submitError: string;
  onChange: (form: ProjectUsageRequestFormState) => void;
  onMaterialChange: (materialId: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormDrawer title="新增领用申请" open={open} onClose={onClose}>
      {canCreateUsage ? (
        <form className="workspace-form" onSubmit={onSubmit} aria-label="新增领用申请表单" noValidate>
          <DrawerFormHeader
            title="新增领用申请"
            icon={<ClipboardList aria-hidden="true" size={16} />}
            action={(
              <button
                type="submit"
                disabled={submitState === "saving" || masterStatus !== "ready" || (!usageOnly && sites.length === 0)}
              >
                <Save aria-hidden="true" size={15} />
                保存领用申请
              </button>
            )}
          />
          <label>
            <span>领用申请单号</span>
            <input value={form.requestNo} onChange={(event) => onChange({ ...form, requestNo: event.target.value })} />
          </label>
          <label>
            <span>申请日期</span>
            <input
              type="date"
              value={form.requestDate}
              onChange={(event) => onChange({ ...form, requestDate: event.target.value })}
            />
          </label>
          {!usageOnly ? (
            <label>
              <span>项目点</span>
              <select value={form.projectSiteId} onChange={(event) => onChange({ ...form, projectSiteId: event.target.value })}>
                <option value="">选择项目点</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteCode} {site.siteName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!usageOnly ? (
            <label>
              <span>仓库</span>
              <select value={form.warehouseId} onChange={(event) => onChange({ ...form, warehouseId: event.target.value })}>
                <option value="">选择仓库</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouseCode} {warehouse.warehouseName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>物料</span>
            <select value={form.materialId} onChange={(event) => onMaterialChange(event.target.value)}>
              <option value="">选择物料</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.materialCode} {material.materialName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>申请数量</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.requestedQuantity}
              onChange={(event) => onChange({ ...form, requestedQuantity: event.target.value })}
            />
          </label>
          <label>
            <span>单位</span>
            <input value={form.unit} onChange={(event) => onChange({ ...form, unit: event.target.value })} />
          </label>
          <label>
            <span>期望日期</span>
            <input
              type="date"
              value={form.expectedDate}
              onChange={(event) => onChange({ ...form, expectedDate: event.target.value })}
            />
          </label>
          {!usageOnly ? (
            <label>
              <span>申请人</span>
              <input value={form.requestedBy} onChange={(event) => onChange({ ...form, requestedBy: event.target.value })} />
            </label>
          ) : null}
          <label>
            <span>用途</span>
            <input value={form.purpose} onChange={(event) => onChange({ ...form, purpose: event.target.value })} />
          </label>
          {masterStatus === "error" ? (
            <p className="form-error">
              {usageOnly ? "物料或默认仓库接口暂不可用，暂不能登记领用。" : "项目点、物料、仓库或业务项目接口暂不可用，暂不能登记领用。"}
            </p>
          ) : null}
          {submitState === "error" ? <p className="form-error">{submitError || "领用申请保存失败，请检查必填项或单号是否重复。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
