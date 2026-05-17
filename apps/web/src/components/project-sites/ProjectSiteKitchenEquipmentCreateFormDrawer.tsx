import { Save, Wrench } from "lucide-react";
import type { FormEvent } from "react";
import {
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  type ProjectSiteDto,
  type ProjectSiteKitchenEquipmentStatusCode,
} from "@company-erp/shared";
import { FormDrawer } from "../ui";

export type ProjectSiteKitchenEquipmentCreateFormState = {
  projectSiteId: string;
  equipmentName: string;
  equipmentCategory: string;
  specification: string;
  quantity: string;
  unit: string;
  location: string;
  status: ProjectSiteKitchenEquipmentStatusCode;
  companyAssetTag: string;
  sourceContractId: string;
  lastCheckedDate: string;
  remark: string;
};

export function ProjectSiteKitchenEquipmentCreateFormDrawer({
  open,
  canEditSites,
  usageOnly,
  form,
  sites,
  submitState,
  submitError,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canEditSites: boolean;
  usageOnly: boolean;
  form: ProjectSiteKitchenEquipmentCreateFormState;
  sites: ProjectSiteDto[];
  submitState: "idle" | "saving" | "error";
  submitError: string;
  onChange: (form: ProjectSiteKitchenEquipmentCreateFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormDrawer title="新增厨房设备" open={open} onClose={onClose}>
      {!usageOnly && canEditSites ? (
        <form className="dashboard-panel party-form" onSubmit={onSubmit} aria-label="新增厨房设备表单" noValidate>
          <div className="panel-header people-panel-title">
            <h3>
              <Wrench aria-hidden="true" size={16} />
              新增厨房设备
            </h3>
            <button type="submit" disabled={submitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存设备
            </button>
          </div>
          <label>
            <span>项目点</span>
            <select
              aria-label="设备项目点"
              value={form.projectSiteId}
              onChange={(event) => onChange({ ...form, projectSiteId: event.target.value })}
              required
            >
              <option value="">选择项目点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.siteName}</option>
              ))}
            </select>
          </label>
          <label>
            <span>设备名称</span>
            <input value={form.equipmentName} onChange={(event) => onChange({ ...form, equipmentName: event.target.value })} required />
          </label>
          <label>
            <span>设备类目</span>
            <input value={form.equipmentCategory} onChange={(event) => onChange({ ...form, equipmentCategory: event.target.value })} />
          </label>
          <label>
            <span>规格型号</span>
            <input value={form.specification} onChange={(event) => onChange({ ...form, specification: event.target.value })} />
          </label>
          <label>
            <span>数量</span>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={form.quantity}
              onChange={(event) => onChange({ ...form, quantity: event.target.value })}
              required
            />
          </label>
          <label>
            <span>单位</span>
            <input value={form.unit} onChange={(event) => onChange({ ...form, unit: event.target.value })} required />
          </label>
          <label>
            <span>位置</span>
            <input value={form.location} onChange={(event) => onChange({ ...form, location: event.target.value })} />
          </label>
          <label>
            <span>状态</span>
            <select
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as ProjectSiteKitchenEquipmentStatusCode })}
            >
              {PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => (
                <option key={status.code} value={status.code}>{status.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>资产标签</span>
            <input value={form.companyAssetTag} onChange={(event) => onChange({ ...form, companyAssetTag: event.target.value })} />
          </label>
          <label>
            <span>最近核对</span>
            <input type="date" value={form.lastCheckedDate} onChange={(event) => onChange({ ...form, lastCheckedDate: event.target.value })} />
          </label>
          {submitState === "error" ? <p className="form-error">{submitError || "厨房设备保存失败，请检查必填项或项目点。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
