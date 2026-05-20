import { MapPin, Save } from "lucide-react";
import type { FormEvent } from "react";
import {
  PROJECT_SITE_SERVICE_MODES,
  type BusinessProjectDto,
  type CreateProjectSiteInput,
  type PartyDto,
} from "@company-erp/shared";
import { DrawerFormHeader, FormDrawer } from "../ui";

export type ProjectSiteCreateFormState = {
  siteCode: string;
  siteName: string;
  clientPartyId: string;
  operatorPartyId: string;
  serviceMode: CreateProjectSiteInput["serviceMode"];
  subcontractorPartyId: string;
  region: string;
  siteAddress: string;
  serviceType: string;
  businessProjectId: string;
  primaryManagerEmployeeId: string;
  clientContactName: string;
  clientContactPhone: string;
  remark: string;
};

export function ProjectSiteCreateFormDrawer({
  open,
  canEditSites,
  form,
  clientParties,
  operatorParties,
  subcontractorParties,
  businessProjects,
  masterStatus,
  submitState,
  submitError,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canEditSites: boolean;
  form: ProjectSiteCreateFormState;
  clientParties: PartyDto[];
  operatorParties: PartyDto[];
  subcontractorParties: PartyDto[];
  businessProjects: BusinessProjectDto[];
  masterStatus: "loading" | "ready" | "error";
  submitState: "idle" | "saving" | "error";
  submitError: string;
  onChange: (form: ProjectSiteCreateFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <FormDrawer title="新增项目点" open={open} onClose={onClose}>
      {canEditSites ? (
        <form className="workspace-form" onSubmit={onSubmit} aria-label="新增项目点表单" noValidate>
          <DrawerFormHeader
            title="新增项目点"
            icon={<MapPin aria-hidden="true" size={16} />}
            action={(
              <button type="submit" disabled={submitState === "saving"}>
                <Save aria-hidden="true" size={15} />
                保存项目点
              </button>
            )}
          />
          <label>
            <span>项目点编码</span>
            <input value={form.siteCode} onChange={(event) => onChange({ ...form, siteCode: event.target.value })} />
          </label>
          <label>
            <span>项目点名称</span>
            <input value={form.siteName} onChange={(event) => onChange({ ...form, siteName: event.target.value })} />
          </label>
          <label>
            <span>客户/服务单位</span>
            <select value={form.clientPartyId} onChange={(event) => onChange({ ...form, clientPartyId: event.target.value })}>
              <option value="">选择客户</option>
              {clientParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>我方主体</span>
            <select value={form.operatorPartyId} onChange={(event) => onChange({ ...form, operatorPartyId: event.target.value })}>
              <option value="">选择我方主体</option>
              {operatorParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>服务模式</span>
            <select
              value={form.serviceMode}
              onChange={(event) =>
                onChange({
                  ...form,
                  serviceMode: event.target.value as ProjectSiteCreateFormState["serviceMode"],
                  subcontractorPartyId: event.target.value === "direct" ? "" : form.subcontractorPartyId,
                })
              }
            >
              {PROJECT_SITE_SERVICE_MODES.map((mode) => (
                <option key={mode.code} value={mode.code}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>外包方</span>
            <select
              value={form.subcontractorPartyId}
              disabled={form.serviceMode !== "subcontracted"}
              onChange={(event) => onChange({ ...form, subcontractorPartyId: event.target.value })}
            >
              <option value="">选择外包方</option>
              {subcontractorParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.partyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>区域</span>
            <input value={form.region} onChange={(event) => onChange({ ...form, region: event.target.value })} />
          </label>
          <label>
            <span>地址</span>
            <input value={form.siteAddress} onChange={(event) => onChange({ ...form, siteAddress: event.target.value })} />
          </label>
          <label>
            <span>业务项目</span>
            <select value={form.businessProjectId} onChange={(event) => onChange({ ...form, businessProjectId: event.target.value })}>
              <option value="">不关联业务项目</option>
              {businessProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} {project.projectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>客户联系人</span>
            <input value={form.clientContactName} onChange={(event) => onChange({ ...form, clientContactName: event.target.value })} />
          </label>
          {masterStatus === "error" ? <p className="form-error">基础资料或业务项目接口暂不可用，项目点可先保存文本字段。</p> : null}
          {submitState === "error" ? <p className="form-error">{submitError || "项目点保存失败，请检查编码是否重复或服务模式规则。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
