import { Save } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { DrawerFormHeader, FieldError, FormDrawer, useFormErrors } from "../ui";
import type { RequestFormState } from "./purchaseWorkspaceTypes";

export function PurchaseRequestFormDrawer({
  canManage,
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
  dirty: boolean;
  form: RequestFormState;
  open: boolean;
  submitError: string;
  submitState: "idle" | "saving" | "error";
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: Dispatch<SetStateAction<RequestFormState>>;
}) {
  const { errors, errorId, fieldProps, clearError, validate, formRef } = useFormErrors<
    "requestNo" | "requesterName" | "departmentName" | "materialName" | "requestedQuantity" | "unit"
  >();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = form.requestedQuantity.trim();
    const valid = validate({
      requestNo: form.requestNo.trim() ? undefined : "请填写采购需求编号",
      requesterName: form.requesterName.trim() ? undefined : "请填写申请人",
      departmentName: form.departmentName.trim() ? undefined : "请填写申请部门",
      materialName: form.materialName.trim() ? undefined : "请填写需求物料名称",
      requestedQuantity: !quantity
        ? "请填写需求数量"
        : Number(quantity) <= 0
          ? "需求数量必须大于 0"
          : undefined,
      unit: form.unit.trim() ? undefined : "请填写需求单位",
    });
    if (!valid) return;
    onSubmit(event);
  }

  return (
    <FormDrawer title="新增采购需求" open={open} dirty={dirty && submitState !== "saving"} onClose={onClose}>
      {canManage ? (
        <form ref={formRef} className="workspace-form" onSubmit={handleSubmit} noValidate>
          <DrawerFormHeader
            title="新增采购需求"
            action={(
              <button type="submit" disabled={submitState === "saving"}>
                <Save aria-hidden="true" size={15} />
                保存采购需求
              </button>
            )}
          />
          <label>
            <span>采购需求编号</span>
            <input {...fieldProps("requestNo")} required value={form.requestNo} onChange={(event) => { clearError("requestNo"); onFormChange((current) => ({ ...current, requestNo: event.target.value })); }} />
          </label>
          <FieldError name="requestNo" errors={errors} errorId={errorId} />
          <label>
            <span>申请人</span>
            <input {...fieldProps("requesterName")} required value={form.requesterName} onChange={(event) => { clearError("requesterName"); onFormChange((current) => ({ ...current, requesterName: event.target.value })); }} />
          </label>
          <FieldError name="requesterName" errors={errors} errorId={errorId} />
          <label>
            <span>申请部门</span>
            <input {...fieldProps("departmentName")} required value={form.departmentName} onChange={(event) => { clearError("departmentName"); onFormChange((current) => ({ ...current, departmentName: event.target.value })); }} />
          </label>
          <FieldError name="departmentName" errors={errors} errorId={errorId} />
          <label>
            <span>需求物料名称</span>
            <input {...fieldProps("materialName")} required value={form.materialName} onChange={(event) => { clearError("materialName"); onFormChange((current) => ({ ...current, materialName: event.target.value })); }} />
          </label>
          <FieldError name="materialName" errors={errors} errorId={errorId} />
          <label>
            <span>需求数量</span>
            <input {...fieldProps("requestedQuantity")} required type="number" min="0.001" step="0.001" value={form.requestedQuantity} onChange={(event) => { clearError("requestedQuantity"); onFormChange((current) => ({ ...current, requestedQuantity: event.target.value })); }} />
          </label>
          <FieldError name="requestedQuantity" errors={errors} errorId={errorId} />
          <label>
            <span>需求单位</span>
            <input {...fieldProps("unit")} required value={form.unit} onChange={(event) => { clearError("unit"); onFormChange((current) => ({ ...current, unit: event.target.value })); }} />
          </label>
          <FieldError name="unit" errors={errors} errorId={errorId} />
          <label>
            <span>期望到货日期</span>
            <input type="date" value={form.expectedArrivalDate} onChange={(event) => onFormChange((current) => ({ ...current, expectedArrivalDate: event.target.value }))} />
          </label>
          {submitState === "error" ? <p className="form-error">{submitError || "保存失败，请检查单号是否重复或稍后重试。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
