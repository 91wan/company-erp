import { PackageMinus, Save } from "lucide-react";
import type { FormEvent } from "react";
import type { ProjectUsageRequestDto } from "@company-erp/shared";
import { FormDrawer } from "../ui";

export type ProjectUsageIssueFormState = {
  requestId: string;
  outboundNo: string;
  movementDate: string;
  quantity: string;
  handledBy: string;
  receivedByName: string;
};

export function ProjectUsageIssueFormDrawer({
  open,
  canIssueUsage,
  form,
  usageRequests,
  pendingIssueConfirm,
  submitState,
  submitError,
  onChange,
  onCancelConfirm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canIssueUsage: boolean;
  form: ProjectUsageIssueFormState;
  usageRequests: ProjectUsageRequestDto[];
  pendingIssueConfirm: boolean;
  submitState: "idle" | "saving" | "error";
  submitError: string;
  onChange: (form: ProjectUsageIssueFormState) => void;
  onCancelConfirm: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const issueableRequests = usageRequests.filter((request) => request.status === "pending" || request.status === "partially_issued");

  return (
    <FormDrawer title="出库登记" open={open} onClose={onClose}>
      {canIssueUsage ? (
        <form className="dashboard-panel party-form project-issue-form" onSubmit={onSubmit} aria-label="出库登记表单" noValidate>
          <div className="panel-header people-panel-title">
            <h3>
              <PackageMinus aria-hidden="true" size={16} />
              出库登记
            </h3>
            <div className="inline-actions">
              <button type="submit" disabled={submitState === "saving" || usageRequests.length === 0 || pendingIssueConfirm}>
                <Save aria-hidden="true" size={15} />
                执行出库
              </button>
              {pendingIssueConfirm ? (
                <div className="inline-confirm-actions" aria-label="确认执行出库">
                  <span>确认执行本次出库？</span>
                  <button type="submit" disabled={submitState === "saving"}>确认出库</button>
                  <button type="button" onClick={onCancelConfirm}>取消</button>
                </div>
              ) : null}
            </div>
          </div>
          <label>
            <span>领用申请</span>
            <select value={form.requestId} onChange={(event) => onChange({ ...form, requestId: event.target.value })}>
              <option value="">选择领用申请</option>
              {issueableRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestNo} {request.projectSiteName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>出库单号</span>
            <input value={form.outboundNo} onChange={(event) => onChange({ ...form, outboundNo: event.target.value })} />
          </label>
          <label>
            <span>领用时间</span>
            <input
              type="date"
              value={form.movementDate}
              onChange={(event) => onChange({ ...form, movementDate: event.target.value })}
            />
          </label>
          <label>
            <span>出库数量</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.quantity}
              onChange={(event) => onChange({ ...form, quantity: event.target.value })}
            />
          </label>
          <label>
            <span>经办人</span>
            <input value={form.handledBy} onChange={(event) => onChange({ ...form, handledBy: event.target.value })} />
          </label>
          <label>
            <span>领用人</span>
            <input value={form.receivedByName} onChange={(event) => onChange({ ...form, receivedByName: event.target.value })} />
          </label>
          {form.requestId ? (
            <p className="form-helper">
              出库成功后会按物料当前项目点收费价生成金额快照；后续调价不会回写历史流水。
            </p>
          ) : null}
          {submitState === "error" ? <p className="form-error">{submitError || "出库失败，请检查库存余额、单号或申请状态。"}</p> : null}
        </form>
      ) : null}
    </FormDrawer>
  );
}
