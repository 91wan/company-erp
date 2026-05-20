import { Save } from "lucide-react";
import type { ContractDto, PurchaseSourceTypeCode } from "@company-erp/shared";
import { PURCHASE_SOURCE_TYPES } from "@company-erp/shared";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { FormDrawer } from "../ui";
import type { RecordFormState } from "./purchaseWorkspaceTypes";

export function PurchaseRecordFormDrawer({
  canManage,
  contracts,
  dirty,
  form,
  open,
  submitError,
  submitState,
  onClose,
  onSubmit,
  onFormChange,
}: {
  canManage: boolean;
  contracts: ContractDto[];
  dirty: boolean;
  form: RecordFormState;
  open: boolean;
  submitError: string;
  submitState: "idle" | "saving" | "error";
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: Dispatch<SetStateAction<RecordFormState>>;
}) {
  return (
    <FormDrawer title="新增采购记录" open={open} dirty={dirty && submitState !== "saving"} onClose={onClose}>
      {canManage ? (
        <form className="dashboard-panel workspace-form" onSubmit={onSubmit} noValidate>
          <div className="panel-header">
            <h3>新增采购记录</h3>
            <button type="submit" disabled={submitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存采购记录
            </button>
          </div>
          <label>
            <span>采购单号</span>
            <input required value={form.purchaseNo} onChange={(event) => onFormChange((current) => ({ ...current, purchaseNo: event.target.value }))} />
          </label>
          <label>
            <span>采购人</span>
            <input required value={form.purchaserName} onChange={(event) => onFormChange((current) => ({ ...current, purchaserName: event.target.value }))} />
          </label>
          <label>
            <span>采购来源</span>
            <select value={form.sourceType} onChange={(event) => onFormChange((current) => ({ ...current, sourceType: event.target.value as PurchaseSourceTypeCode }))}>
              {PURCHASE_SOURCE_TYPES.map((sourceType) => (
                <option key={sourceType.code} value={sourceType.code}>
                  {sourceType.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>采购平台/渠道</span>
            <input value={form.purchasePlatform} onChange={(event) => onFormChange((current) => ({ ...current, purchasePlatform: event.target.value }))} />
          </label>
          <label>
            <span>供应商名称辅助</span>
            <input value={form.supplierNameText} onChange={(event) => onFormChange((current) => ({ ...current, supplierNameText: event.target.value }))} />
          </label>
          <label>
            <span>采购说明</span>
            <input value={form.purchaseDescription} onChange={(event) => onFormChange((current) => ({ ...current, purchaseDescription: event.target.value }))} />
          </label>
          <label>
            <span>关联合同</span>
            <select value={form.contractId} onChange={(event) => onFormChange((current) => ({ ...current, contractId: event.target.value }))}>
              <option value="">不关联合同</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractNo} {contract.contractName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>采购日期</span>
            <input required type="date" value={form.purchaseDate} onChange={(event) => onFormChange((current) => ({ ...current, purchaseDate: event.target.value }))} />
          </label>
          <label>
            <span>采购物料名称</span>
            <input required value={form.materialName} onChange={(event) => onFormChange((current) => ({ ...current, materialName: event.target.value }))} />
          </label>
          <label>
            <span>采购数量</span>
            <input required type="number" min="0.001" step="0.001" value={form.purchaseQuantity} onChange={(event) => onFormChange((current) => ({ ...current, purchaseQuantity: event.target.value }))} />
          </label>
          <label>
            <span>采购单位</span>
            <input required value={form.unit} onChange={(event) => onFormChange((current) => ({ ...current, unit: event.target.value }))} />
          </label>
          {submitState === "error" ? <p className="form-error">{submitError || "保存失败，请检查单号是否重复或稍后重试。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
