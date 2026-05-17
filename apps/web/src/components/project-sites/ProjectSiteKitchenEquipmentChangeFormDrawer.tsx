import { ClipboardList, Save } from "lucide-react";
import type { FormEvent } from "react";
import {
  PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES,
  PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES,
  type ProjectSiteDto,
  type ProjectSiteKitchenEquipmentChangeTypeCode,
  type ProjectSiteKitchenEquipmentDto,
  type ProjectSiteKitchenEquipmentStatusCode,
} from "@company-erp/shared";
import { FormDrawer } from "../ui";

export type ProjectSiteKitchenEquipmentChangeFormState = {
  projectSiteId: string;
  equipmentId: string;
  equipmentName: string;
  changeType: ProjectSiteKitchenEquipmentChangeTypeCode;
  proposedQuantity: string;
  proposedLocation: string;
  proposedStatus: "" | ProjectSiteKitchenEquipmentStatusCode;
  description: string;
};

export function ProjectSiteKitchenEquipmentChangeFormDrawer({
  open,
  usageOnly,
  form,
  sites,
  kitchenEquipment,
  submitState,
  submitError,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  usageOnly: boolean;
  form: ProjectSiteKitchenEquipmentChangeFormState;
  sites: ProjectSiteDto[];
  kitchenEquipment: ProjectSiteKitchenEquipmentDto[];
  submitState: "idle" | "saving" | "error";
  submitError: string;
  onChange: (form: ProjectSiteKitchenEquipmentChangeFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormDrawer title="上报设备变更" open={open} onClose={onClose}>
      <form className="dashboard-panel party-form" onSubmit={onSubmit} aria-label="厨房设备变更上报表单" noValidate>
        <div className="panel-header people-panel-title">
          <h3>
            <ClipboardList aria-hidden="true" size={16} />
            上报设备变更
          </h3>
          <button type="submit" disabled={submitState === "saving"}>
            <Save aria-hidden="true" size={15} />
            提交上报
          </button>
        </div>
        {!usageOnly ? (
          <label>
            <span>项目点</span>
            <select
              aria-label="上报项目点"
              value={form.projectSiteId}
              onChange={(event) => onChange({ ...form, projectSiteId: event.target.value })}
            >
              <option value="">选择项目点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.siteName}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>关联设备</span>
          <select
            aria-label="关联设备"
            value={form.equipmentId}
            onChange={(event) => {
              const selected = kitchenEquipment.find((item) => item.id === event.target.value);
              onChange({
                ...form,
                equipmentId: event.target.value,
                equipmentName: selected?.equipmentName ?? form.equipmentName,
                projectSiteId: selected?.projectSiteId ?? form.projectSiteId,
              });
            }}
          >
            <option value="">新增设备或不关联</option>
            {kitchenEquipment.map((item) => (
              <option key={item.id} value={item.id}>{item.equipmentName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>设备名称</span>
          <input value={form.equipmentName} onChange={(event) => onChange({ ...form, equipmentName: event.target.value })} required />
        </label>
        <label>
          <span>变更类型</span>
          <select
            value={form.changeType}
            onChange={(event) => onChange({ ...form, changeType: event.target.value as ProjectSiteKitchenEquipmentChangeTypeCode })}
          >
            {PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_TYPES.map((type) => (
              <option key={type.code} value={type.code}>{type.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>变更数量</span>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={form.proposedQuantity}
            onChange={(event) => onChange({ ...form, proposedQuantity: event.target.value })}
          />
        </label>
        <label>
          <span>变更位置</span>
          <input value={form.proposedLocation} onChange={(event) => onChange({ ...form, proposedLocation: event.target.value })} />
        </label>
        <label>
          <span>变更状态</span>
          <select
            value={form.proposedStatus}
            onChange={(event) => onChange({ ...form, proposedStatus: event.target.value as "" | ProjectSiteKitchenEquipmentStatusCode })}
          >
            <option value="">不变更状态</option>
            {PROJECT_SITE_KITCHEN_EQUIPMENT_STATUSES.map((status) => (
              <option key={status.code} value={status.code}>{status.label}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>说明</span>
          <textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
        </label>
        {submitState === "error" ? <p className="form-error">{submitError || "设备变更上报失败，请检查设备名称或项目点。"}</p> : null}
      </form>
    </FormDrawer>
  );
}
