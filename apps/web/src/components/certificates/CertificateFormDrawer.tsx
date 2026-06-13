import { AlertTriangle, Save, ShieldCheck, UploadCloud } from "lucide-react";
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
    model.form.certificateName ||
    model.form.certificateImageFile ||
    model.form.ownerNameSnapshot ||
    model.form.imageDisplayName ||
    model.form.certificateNumber ||
    model.form.remark,
  );

  return (
    <FormDrawer title="上传证照图片" open={model.createDrawerOpen} dirty={dirty} onClose={() => model.setCreateDrawerOpen(false)}>
      {model.canManage ? (
        <section className="workspace-panel certificate-create-panel">
          <CertificatePanelHeader title="图片归档信息" icon={<ShieldCheck size={18} />} />
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
  const hasImage = Boolean(form.certificateImageFile);
  return (
    <form className="stacked-form" onSubmit={onSubmit}>
      <div className="certificate-image-intake-card">
        <UploadCloud aria-hidden="true" size={20} />
        <div>
          <strong>先上传证照图片</strong>
          <p>证照名称、到期日期由总部复核时补录，不再作为上传前必填项。</p>
          <p>支持 PNG、JPG、PDF；健康证、食品经营许可证、营业执照、体系认证和荣誉证明都先按图片归档。</p>
        </div>
      </div>
      <label>
        证照图片或扫描件
        <input
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            onFormChange({
              ...form,
              certificateImageFile: file,
              imageDisplayName: file?.name ?? "",
            });
          }}
        />
      </label>
      {hasImage ? (
        <p className="form-hint">已选择：{form.imageDisplayName || form.certificateImageFile?.name}</p>
      ) : (
        <p className="form-hint">没有图片时也可先建立“待复核”记录，但正式材料建议直接上传图片。</p>
      )}
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
        归属名称快照（可选）
        <input value={form.ownerNameSnapshot} onChange={(event) => onFormChange({ ...form, ownerNameSnapshot: event.target.value })} />
      </label>
      <details className="certificate-review-details">
        <summary>复核补录信息</summary>
        <p className="form-hint">从图片能确认后再补录；证照编码由系统生成，不需要业务用户填写。</p>
        <label>
          证照名称（复核补录）
          <input value={form.certificateName} onChange={(event) => onFormChange({ ...form, certificateName: event.target.value })} />
        </label>
        <label>
          有效期类型
          <select value={form.validityType} onChange={(event) => onFormChange({ ...form, validityType: event.target.value as CertificateValidityTypeCode })}>
            {CERTIFICATE_VALIDITY_TYPES.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        {form.validityType === "fixed_expiry" ? (
          <label>
            到期日期（复核补录）
            <input type="date" value={form.expiryDate} onChange={(event) => onFormChange({ ...form, expiryDate: event.target.value })} />
          </label>
        ) : (
          <label>
            下次复核日期（可选）
            <input type="date" value={form.nextReviewDate} onChange={(event) => onFormChange({ ...form, nextReviewDate: event.target.value })} />
          </label>
        )}
        <label>
          证面编号（可选）
          <input value={form.certificateNumber} onChange={(event) => onFormChange({ ...form, certificateNumber: event.target.value })} />
        </label>
      </details>
      <p className="form-hint">保存后图片进入“统一附件”；历史附件路径和来源文件仅在详情中只读展示。</p>
      <button type="submit" disabled={model.submitState === "saving"}>
        <Save aria-hidden="true" size={16} />
        {hasImage ? "保存并上传图片" : "保存待复核记录"}
      </button>
      {model.submitState === "error" ? <CertificateStateLine text={model.submitError || "证照保存或图片上传失败，请检查归属对象、图片格式或复核日期。"} tone="danger" /> : null}
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
