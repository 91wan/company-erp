import { Save } from "lucide-react";
import type { ContractDto, PurchaseSourceTypeCode } from "@company-erp/shared";
import { PURCHASE_SOURCE_TYPES } from "@company-erp/shared";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { DrawerFormHeader, FieldError, FormDrawer, useFormErrors } from "../ui";
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
  const { errors, errorId, fieldProps, clearError, validate, formRef } = useFormErrors<
    "purchaseNo" | "purchaserName" | "purchaseDate" | "materialName" | "purchaseQuantity" | "unit"
  >();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = form.purchaseQuantity.trim();
    const valid = validate({
      purchaseNo: form.purchaseNo.trim() ? undefined : "请填写采购单号",
      purchaserName: form.purchaserName.trim() ? undefined : "请填写采购人",
      purchaseDate: form.purchaseDate ? undefined : "请填写采购日期",
      materialName: form.materialName.trim() ? undefined : "请填写采购物料名称",
      purchaseQuantity: !quantity
        ? "请填写采购数量"
        : Number(quantity) <= 0
          ? "采购数量必须大于 0"
          : undefined,
      unit: form.unit.trim() ? undefined : "请填写采购单位",
    });
    if (!valid) return;
    onSubmit(event);
  }

  return (
    <FormDrawer title="新增采购记录" open={open} dirty={dirty && submitState !== "saving"} onClose={onClose}>
      {canManage ? (
        <form ref={formRef} className="workspace-form" onSubmit={handleSubmit} noValidate>
          <DrawerFormHeader
            title="新增采购记录"
            action={(
              <button type="submit" disabled={submitState === "saving"}>
                <Save aria-hidden="true" size={15} />
                保存采购记录
              </button>
            )}
          />
          <label>
            <span>采购单号</span>
            <input {...fieldProps("purchaseNo")} required value={form.purchaseNo} onChange={(event) => { clearError("purchaseNo"); onFormChange((current) => ({ ...current, purchaseNo: event.target.value })); }} />
          </label>
          <FieldError name="purchaseNo" errors={errors} errorId={errorId} />
          <label>
            <span>采购人</span>
            <input {...fieldProps("purchaserName")} required value={form.purchaserName} onChange={(event) => { clearError("purchaserName"); onFormChange((current) => ({ ...current, purchaserName: event.target.value })); }} />
          </label>
          <FieldError name="purchaserName" errors={errors} errorId={errorId} />
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
            <input {...fieldProps("purchaseDate")} required type="date" value={form.purchaseDate} onChange={(event) => { clearError("purchaseDate"); onFormChange((current) => ({ ...current, purchaseDate: event.target.value })); }} />
          </label>
          <FieldError name="purchaseDate" errors={errors} errorId={errorId} />
          <label>
            <span>采购物料名称</span>
            <input {...fieldProps("materialName")} required value={form.materialName} onChange={(event) => { clearError("materialName"); onFormChange((current) => ({ ...current, materialName: event.target.value })); }} />
          </label>
          <FieldError name="materialName" errors={errors} errorId={errorId} />
          <label>
            <span>采购数量</span>
            <input {...fieldProps("purchaseQuantity")} required type="number" min="0.001" step="0.001" value={form.purchaseQuantity} onChange={(event) => { clearError("purchaseQuantity"); onFormChange((current) => ({ ...current, purchaseQuantity: event.target.value })); }} />
          </label>
          <FieldError name="purchaseQuantity" errors={errors} errorId={errorId} />
          <label>
            <span>采购单位</span>
            <input {...fieldProps("unit")} required value={form.unit} onChange={(event) => { clearError("unit"); onFormChange((current) => ({ ...current, unit: event.target.value })); }} />
          </label>
          <FieldError name="unit" errors={errors} errorId={errorId} />
          {submitState === "error" ? <p className="form-error">{submitError || "保存失败，请检查单号是否重复或稍后重试。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
