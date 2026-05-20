import { AlertTriangle, Save, ShieldCheck } from "lucide-react";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_VALIDITY_TYPES,
  type CertificateOwnerTypeCode,
  type CertificateTypeCode,
  type CertificateValidityTypeCode,
} from "@company-erp/shared";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { FormDrawer } from "../ui";
import {
  CertificatePanelHeader,
  CertificateStateLine,
} from "./CertificatesWorkspaceParts";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";
import type { CertificateFormState } from "./certificateWorkspaceTypes";

export function CertificateFormDrawer({
  model,
}: {
  model: CertificatesWorkspaceController;
}) {
  const dirty = Boolean(
    model.form.certificateCode ||
    model.form.certificateName ||
    model.form.ownerNameSnapshot ||
    model.form.certificateNumber ||
    model.form.remark,
  );

  return (
    <FormDrawer title="新增证照" open={model.createDrawerOpen} dirty={dirty} onClose={() => model.setCreateDrawerOpen(false)}>
      {model.canManage ? (
        <section className="workspace-panel certificate-create-panel">
          <CertificatePanelHeader title="新增证照" icon={<ShieldCheck size={18} />} />
          {model.masterStatus === "error" ? (
            <CertificateStateLine icon={<AlertTriangle size={16} />} text="人员、项目点或往来方接口暂不可用，仍可填写名称快照。" tone="danger" />
          ) : null}
          <CertificateFormFields model={model} onSubmit={model.handleSubmit} onFormChange={model.setForm} />
        </section>
      ) : null}
    </FormDrawer>
  );
}

function CertificateFormFields({
  model,
  onSubmit,
  onFormChange,
}: {
  model: CertificatesWorkspaceController;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: Dispatch<SetStateAction<CertificateFormState>>;
}) {
  const form = model.form;
  return (
    <form className="stacked-form" onSubmit={onSubmit}>
      <label>
        证照编码
        <input value={form.certificateCode} onChange={(event) => onFormChange({ ...form, certificateCode: event.target.value })} />
      </label>
      <label>
        证照名称
        <input value={form.certificateName} onChange={(event) => onFormChange({ ...form, certificateName: event.target.value })} />
      </label>
      <label>
        证照类型
        <select value={form.certificateType} onChange={(event) => onFormChange({ ...form, certificateType: event.target.value as CertificateTypeCode })}>
          {CERTIFICATE_TYPES.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </label>
      <label>
        归属对象
        <select
          value={form.ownerType}
          onChange={(event) =>
            onFormChange({
              ...form,
              ownerType: event.target.value as CertificateOwnerTypeCode,
              ownerEmployeeId: "",
              ownerRosterPersonId: "",
              ownerProjectSiteId: "",
              ownerPartyId: "",
            })
          }
        >
          {model.ownerOptions.ownerTypeOptions.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </label>
      <PersonOwnerFields model={model} onFormChange={onFormChange} />
      <ProjectSiteOwnerField model={model} onFormChange={onFormChange} />
      <PartyOwnerField model={model} onFormChange={onFormChange} />
      <label>
        名称快照
        <input value={form.ownerNameSnapshot} onChange={(event) => onFormChange({ ...form, ownerNameSnapshot: event.target.value })} />
      </label>
      <label>
        有效期类型
        <select value={form.validityType} onChange={(event) => onFormChange({ ...form, validityType: event.target.value as CertificateValidityTypeCode })}>
          {CERTIFICATE_VALIDITY_TYPES.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </label>
      <label>
        到期日期
        <input type="date" value={form.expiryDate} onChange={(event) => onFormChange({ ...form, expiryDate: event.target.value })} />
      </label>
      <label>
        下次复核日期
        <input type="date" value={form.nextReviewDate} onChange={(event) => onFormChange({ ...form, nextReviewDate: event.target.value })} />
      </label>
      <label>
        证照编号
        <input value={form.certificateNumber} onChange={(event) => onFormChange({ ...form, certificateNumber: event.target.value })} />
      </label>
      <p className="form-hint">正式附件请在证照保存后进入详情的“统一附件”登记；历史附件路径和来源文件仅在详情中只读展示。</p>
      <button type="submit" disabled={model.submitState === "saving"}>
        <Save aria-hidden="true" size={16} />
        保存证照
      </button>
      {model.submitState === "saved" ? <CertificateStateLine text="证照已保存" /> : null}
      {model.submitState === "error" ? <CertificateStateLine text={model.submitError || "证照保存失败，请检查编码、归属对象或日期。"} tone="danger" /> : null}
    </form>
  );
}

function PersonOwnerFields({
  model,
  onFormChange,
}: {
  model: CertificatesWorkspaceController;
  onFormChange: Dispatch<SetStateAction<CertificateFormState>>;
}) {
  const form = model.form;
  if (form.ownerType !== "person") return null;
  return (
    <>
      <label>
        人员来源
        <select
          value={form.ownerPersonSource}
          onChange={(event) =>
            onFormChange({
              ...form,
              ownerPersonSource: event.target.value as "employee" | "roster",
              ownerEmployeeId: "",
              ownerRosterPersonId: "",
            })
          }
        >
          {model.ownerOptions.personOwnerSourceOptions.includes("employee") ? <option value="employee">公司员工</option> : null}
          {model.ownerOptions.personOwnerSourceOptions.includes("roster") ? <option value="roster">项目点现场人员</option> : null}
        </select>
      </label>
      {form.ownerPersonSource === "employee" ? (
        <label>
          公司员工
          <select value={form.ownerEmployeeId} onChange={(event) => onFormChange({ ...form, ownerEmployeeId: event.target.value })}>
            <option value="">仅填写名称快照</option>
            {model.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
        </label>
      ) : (
        <label>
          项目点现场人员
          <select value={form.ownerRosterPersonId} onChange={(event) => onFormChange({ ...form, ownerRosterPersonId: event.target.value })}>
            <option value="">仅填写名称快照</option>
            {model.rosterPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.personName}{person.projectSiteName ? ` / ${person.projectSiteName}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

function ProjectSiteOwnerField({
  model,
  onFormChange,
}: {
  model: CertificatesWorkspaceController;
  onFormChange: Dispatch<SetStateAction<CertificateFormState>>;
}) {
  const form = model.form;
  if (form.ownerType !== "project_site") return null;
  return (
    <label>
      项目点
      <select value={form.ownerProjectSiteId} onChange={(event) => onFormChange({ ...form, ownerProjectSiteId: event.target.value })}>
        <option value="">仅填写名称快照</option>
        {model.projectSites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
      </select>
    </label>
  );
}

function PartyOwnerField({
  model,
  onFormChange,
}: {
  model: CertificatesWorkspaceController;
  onFormChange: Dispatch<SetStateAction<CertificateFormState>>;
}) {
  const form = model.form;
  if (form.ownerType !== "supplier" && form.ownerType !== "company") return null;
  return (
    <label>
      往来方
      <select value={form.ownerPartyId} onChange={(event) => onFormChange({ ...form, ownerPartyId: event.target.value })}>
        <option value="">仅填写名称快照</option>
        {model.parties.map((party) => <option key={party.id} value={party.id}>{party.partyName}</option>)}
      </select>
    </label>
  );
}
