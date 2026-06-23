import { RefreshCw, Save } from "lucide-react";
import type { BusinessProjectDto, ContractDirectionCode, ContractFormCode, ContractInvestmentCategoryCode, ContractStatusCode, ContractSubjectCategoryCode, PartyDto, ProjectSiteDto } from "@company-erp/shared";
import { FieldError, FormDrawer } from "../ui";
import {
  CONTRACT_DIRECTIONS,
  CONTRACT_FORMS,
  CONTRACT_INVESTMENT_CATEGORIES,
  CONTRACT_STATUSES,
  CONTRACT_SUBJECT_CATEGORIES,
  type ContractFormState,
} from "./contractsTypes";
import type { ContractsController } from "./useContractsController";
import type { ReactNode } from "react";

export function ContractFormDrawer({ model }: { model: ContractsController }) {
  return (
    <FormDrawer title="新增合同" open={model.openFormDrawer === "contract"} onClose={() => model.setOpenFormDrawer(null)}>
      {model.canManage ? (
        <form ref={model.formRef} className="workspace-form" onSubmit={model.handleContractSubmit} noValidate>
          <div className="drawer-form-header">
            <h3>新增合同</h3>
            <button type="submit" disabled={model.contractSubmitState === "saving" || !model.hasCounterparties}>
              <Save aria-hidden="true" size={15} />
              保存合同
            </button>
          </div>
          <ContractFormBody
            businessProjects={model.businessProjects}
            clearError={model.clearError}
            errorId={model.errorId}
            errors={model.errors}
            fieldProps={model.fieldProps}
            form={model.contractForm}
            masterStatus={model.masterStatus}
            parties={model.parties}
            projectSites={model.projectSites}
            submitError={model.contractSubmitError}
            submitState={model.contractSubmitState}
            onChange={model.setContractForm}
          />
        </form>
      ) : null}
    </FormDrawer>
  );
}

function ContractFormBody({
  businessProjects,
  clearError,
  errorId,
  errors,
  fieldProps,
  form,
  masterStatus,
  parties,
  projectSites,
  submitError,
  submitState,
  onChange,
}: {
  businessProjects: BusinessProjectDto[];
  clearError: ContractsController["clearError"];
  errorId: ContractsController["errorId"];
  errors: ContractsController["errors"];
  fieldProps: ContractsController["fieldProps"];
  form: ContractFormState;
  masterStatus: "loading" | "ready" | "error";
  parties: PartyDto[];
  projectSites: ProjectSiteDto[];
  submitError: string;
  submitState: "idle" | "saving" | "saved" | "error";
  onChange: (updater: (current: ContractFormState) => ContractFormState) => void;
}) {
  if (masterStatus === "loading") return <StateMessage icon={<RefreshCw size={18} />} text="加载往来方、业务项目和项目点..." />;
  if (masterStatus === "error") return <p className="form-error">往来方、业务项目或项目点接口暂不可用，暂不能新增合同。</p>;
  return (
    <>
      {parties.length === 0 ? <p className="form-error">缺少往来方资料，暂不能新增合同。</p> : null}
      <label>
        <span>合同编号</span>
        <input {...fieldProps("contractNo")} required value={form.contractNo} onChange={(event) => { clearError("contractNo"); onChange((current) => ({ ...current, contractNo: event.target.value })); }} />
      </label>
      <FieldError name="contractNo" errors={errors} errorId={errorId} />
      <label>
        <span>合同名称</span>
        <input {...fieldProps("contractName")} required value={form.contractName} onChange={(event) => { clearError("contractName"); onChange((current) => ({ ...current, contractName: event.target.value })); }} />
      </label>
      <FieldError name="contractName" errors={errors} errorId={errorId} />
      <label>
        <span>相对方</span>
        <select {...fieldProps("counterpartyPartyId")} required value={form.counterpartyPartyId} onChange={(event) => { clearError("counterpartyPartyId"); onChange((current) => ({ ...current, counterpartyPartyId: event.target.value })); }}>
          {parties.map((party) => <option key={party.id} value={party.id}>{party.partyCode} {party.partyName}</option>)}
        </select>
      </label>
      <FieldError name="counterpartyPartyId" errors={errors} errorId={errorId} />
      <SelectField label="合同方向" value={form.direction} options={CONTRACT_DIRECTIONS} onChange={(value) => onChange((current) => ({ ...current, direction: value as ContractDirectionCode }))} />
      <SelectField label="合同形态" value={form.contractForm} options={CONTRACT_FORMS} onChange={(value) => onChange((current) => ({ ...current, contractForm: value as ContractFormCode }))} />
      <SelectField label="合同标的" value={form.subjectCategory} options={CONTRACT_SUBJECT_CATEGORIES} onChange={(value) => onChange((current) => ({ ...current, subjectCategory: value as ContractSubjectCategoryCode }))} />
      <SelectField label="合同状态" value={form.status} options={CONTRACT_STATUSES} onChange={(value) => onChange((current) => ({ ...current, status: value as ContractStatusCode }))} />
      <label>
        <span>投入分类</span>
        <select value={form.investmentCategory} onChange={(event) => onChange((current) => ({ ...current, investmentCategory: event.target.value as "" | ContractInvestmentCategoryCode }))}>
          <option value="">非投入类合同</option>
          {CONTRACT_INVESTMENT_CATEGORIES.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
        </select>
      </label>
      <RelatedSelect label="业务项目" emptyLabel="不关联业务项目" value={form.businessProjectId} options={businessProjects.map((project) => ({ id: project.id, label: `${project.projectCode} ${project.projectName}` }))} onChange={(value) => onChange((current) => ({ ...current, businessProjectId: value }))} />
      <RelatedSelect label="项目点" emptyLabel="不关联项目点" value={form.projectSiteId} options={projectSites.map((site) => ({ id: site.id, label: `${site.siteCode} ${site.siteName}` }))} onChange={(value) => onChange((current) => ({ ...current, projectSiteId: value }))} />
      <label><span>签订日期</span><input type="date" value={form.signedDate} onChange={(event) => onChange((current) => ({ ...current, signedDate: event.target.value }))} /></label>
      <label><span>开始日期</span><input {...fieldProps("startDate")} required type="date" value={form.startDate} onChange={(event) => { clearError("startDate"); clearError("endDate"); onChange((current) => ({ ...current, startDate: event.target.value })); }} /></label>
      <FieldError name="startDate" errors={errors} errorId={errorId} />
      <label><span>结束日期（框架合同可空）</span><input {...fieldProps("endDate")} aria-label="结束日期" required={form.contractForm !== "framework"} type="date" value={form.endDate} onChange={(event) => { clearError("endDate"); onChange((current) => ({ ...current, endDate: event.target.value })); }} /></label>
      <FieldError name="endDate" errors={errors} errorId={errorId} />
      <label><span>合同金额</span><input {...fieldProps("amount")} type="number" min="0" step="0.01" value={form.amount} onChange={(event) => { clearError("amount"); onChange((current) => ({ ...current, amount: event.target.value })); }} /></label>
      <FieldError name="amount" errors={errors} errorId={errorId} />
      <label><span>预算金额</span><input {...fieldProps("budgetAmount")} type="number" min="0" step="0.01" value={form.budgetAmount} onChange={(event) => { clearError("budgetAmount"); onChange((current) => ({ ...current, budgetAmount: event.target.value })); }} /></label>
      <FieldError name="budgetAmount" errors={errors} errorId={errorId} />
      <p className="form-hint">正式附件请在合同保存后进入详情的“统一附件”登记；历史主附件引用仅在详情中只读展示。</p>
      <label><span>备注</span><input value={form.remark} onChange={(event) => onChange((current) => ({ ...current, remark: event.target.value }))} /></label>
      {submitState === "error" ? <p className="form-error">{submitError || "合同保存失败，请检查编号、日期或金额。"}</p> : null}
    </>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly { code: string; label: string }[]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>;
}

function RelatedSelect({ label, emptyLabel, value, options, onChange }: { label: string; emptyLabel: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">{emptyLabel}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}

function StateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return <div className="workspace-state">{icon}<span>{text}</span></div>;
}
