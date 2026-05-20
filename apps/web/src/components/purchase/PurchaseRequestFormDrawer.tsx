import { Save } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { FormDrawer } from "../ui";
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
  return (
    <FormDrawer title="新增采购需求" open={open} dirty={dirty && submitState !== "saving"} onClose={onClose}>
      {canManage ? (
        <form className="dashboard-panel workspace-form" onSubmit={onSubmit} noValidate>
          <div className="panel-header">
            <h3>新增采购需求</h3>
            <button type="submit" disabled={submitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存采购需求
            </button>
          </div>
          <label>
            <span>采购需求编号</span>
            <input required value={form.requestNo} onChange={(event) => onFormChange((current) => ({ ...current, requestNo: event.target.value }))} />
          </label>
          <label>
            <span>申请人</span>
            <input required value={form.requesterName} onChange={(event) => onFormChange((current) => ({ ...current, requesterName: event.target.value }))} />
          </label>
          <label>
            <span>申请部门</span>
            <input required value={form.departmentName} onChange={(event) => onFormChange((current) => ({ ...current, departmentName: event.target.value }))} />
          </label>
          <label>
            <span>需求物料名称</span>
            <input required value={form.materialName} onChange={(event) => onFormChange((current) => ({ ...current, materialName: event.target.value }))} />
          </label>
          <label>
            <span>需求数量</span>
            <input required type="number" min="0.001" step="0.001" value={form.requestedQuantity} onChange={(event) => onFormChange((current) => ({ ...current, requestedQuantity: event.target.value }))} />
          </label>
          <label>
            <span>需求单位</span>
            <input required value={form.unit} onChange={(event) => onFormChange((current) => ({ ...current, unit: event.target.value }))} />
          </label>
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
