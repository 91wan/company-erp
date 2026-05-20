import { Check, X } from "lucide-react";
import type { PurchaseRequestDto } from "@company-erp/shared";
import { ConfirmAction, InlineActions, SectionCard, WorkspaceTableContainer } from "../ui";
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
          <WorkspaceTableContainer>
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
                        <InlineActions>
                          <ConfirmAction
                            actionLabel={(
                              <>
                                <Check aria-hidden="true" size={14} />
                                审批通过 {request.requestNo}
                              </>
                            )}
                            confirmationText={`确认审批通过 ${request.requestNo}？`}
                            confirmLabel="确认审批通过"
                            disabled={reviewState === "saving"}
                            pending={reviewState === "saving" && pendingReviewAction?.requestId === request.id && pendingReviewAction.action === "approve"}
                            confirming={pendingReviewAction?.requestId === request.id && pendingReviewAction.action === "approve"}
                            onRequestConfirm={() => onPendingReviewActionChange({ action: "approve", requestId: request.id })}
                            onCancel={() => onPendingReviewActionChange(null)}
                            onConfirm={() => onReview("approve", request)}
                          />
                          <ConfirmAction
                            actionLabel={(
                              <>
                                <X aria-hidden="true" size={14} />
                                驳回 {request.requestNo}
                              </>
                            )}
                            confirmationText={`确认驳回 ${request.requestNo}？`}
                            confirmLabel="确认驳回"
                            danger
                            disabled={reviewState === "saving"}
                            pending={reviewState === "saving" && pendingReviewAction?.requestId === request.id && pendingReviewAction.action === "reject"}
                            confirming={pendingReviewAction?.requestId === request.id && pendingReviewAction.action === "reject"}
                            onRequestConfirm={() => onPendingReviewActionChange({ action: "reject", requestId: request.id })}
                            onCancel={() => onPendingReviewActionChange(null)}
                            onConfirm={() => onReview("reject", request)}
                          />
                        </InlineActions>
                      ) : (
                        "只读"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WorkspaceTableContainer>
        </>
      ) : null}
      {reviewState === "error" ? <p className="form-error">{reviewError || "审批操作失败"}</p> : null}
    </SectionCard>
  );
}
