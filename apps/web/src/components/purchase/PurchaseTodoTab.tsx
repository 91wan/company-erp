import { Check, X } from "lucide-react";
import type { PurchaseRequestDto } from "@company-erp/shared";
import { SectionCard } from "../ui";
import { formatDateTime, PurchaseStateMessage } from "./PurchaseWorkspaceParts";
import type { PurchasePendingReviewAction, PurchaseSubmitState } from "./purchaseWorkspaceTypes";

export function PurchaseTodoTab({
  canManage,
  pendingApprovalRequests,
  pendingReviewAction,
  reviewError,
  reviewRemark,
  reviewState,
  onReview,
  onReviewRemarkChange,
  onPendingReviewActionChange,
}: {
  canManage: boolean;
  pendingApprovalRequests: PurchaseRequestDto[];
  pendingReviewAction: PurchasePendingReviewAction;
  reviewError: string;
  reviewRemark: string;
  reviewState: PurchaseSubmitState;
  onReview: (action: "submit" | "approve" | "reject", target: PurchaseRequestDto) => void;
  onReviewRemarkChange: (value: string) => void;
  onPendingReviewActionChange: (action: PurchasePendingReviewAction) => void;
}) {
  return (
    <SectionCard title="待审批" action={<Check aria-hidden="true" size={17} />}>
      {pendingApprovalRequests.length === 0 ? <PurchaseStateMessage text="暂无待审批采购需求" /> : null}
      {pendingApprovalRequests.length > 0 ? (
        <>
          <label className="full-width-field">
            <span>审批备注</span>
            <input value={reviewRemark} onChange={(event) => onReviewRemarkChange(event.target.value)} />
          </label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>编号</th>
                  <th>申请人</th>
                  <th>物料</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovalRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requestNo}</td>
                    <td>{request.requesterName}</td>
                    <td>{request.lines[0]?.materialName ?? "-"}</td>
                    <td>{request.submittedAt ? formatDateTime(request.submittedAt) : "-"}</td>
                    <td>
                      {canManage ? (
                        <div className="inline-actions">
                          <button
                            type="button"
                            disabled={reviewState === "saving"}
                            onClick={() => onPendingReviewActionChange({ action: "approve", requestId: request.id })}
                          >
                            <Check aria-hidden="true" size={14} />
                            审批通过 {request.requestNo}
                          </button>
                          <button
                            type="button"
                            disabled={reviewState === "saving"}
                            onClick={() => onPendingReviewActionChange({ action: "reject", requestId: request.id })}
                          >
                            <X aria-hidden="true" size={14} />
                            驳回 {request.requestNo}
                          </button>
                          {pendingReviewAction?.requestId === request.id ? (
                            <div
                              className="inline-confirm-actions"
                              aria-label={`确认${pendingReviewAction.action === "approve" ? "审批通过" : "驳回"} ${request.requestNo}`}
                            >
                              <span>
                                确认{pendingReviewAction.action === "approve" ? "审批通过" : "驳回"} {request.requestNo}？
                              </span>
                              <button
                                type="button"
                                disabled={reviewState === "saving"}
                                onClick={() => onReview(pendingReviewAction.action, request)}
                              >
                                确认{pendingReviewAction.action === "approve" ? "审批通过" : "驳回"}
                              </button>
                              <button type="button" onClick={() => onPendingReviewActionChange(null)}>取消</button>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        "只读"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {reviewState === "error" ? <p className="form-error">{reviewError || "审批操作失败"}</p> : null}
    </SectionCard>
  );
}
