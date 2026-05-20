import { RefreshCw, RotateCw, Send, XCircle } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  ConvertReplenishmentSuggestionInput,
  GenerateReplenishmentSuggestionsResult,
  PurchaseRequestDto,
  ReplenishmentSuggestionDto,
  UpdateReplenishmentSuggestionInput,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";
import { SectionCard, SummaryCard, WorkspaceScaffold } from "./ui";

type ConvertResult = {
  replenishmentSuggestion: ReplenishmentSuggestionDto;
  purchaseRequest: PurchaseRequestDto;
};

type ReplenishmentSuggestionsWorkspaceProps = {
  loadSuggestions?: () => Promise<ReplenishmentSuggestionDto[]>;
  generateSuggestions?: () => Promise<GenerateReplenishmentSuggestionsResult>;
  updateSuggestion?: (
    id: string,
    input: UpdateReplenishmentSuggestionInput,
  ) => Promise<ReplenishmentSuggestionDto>;
  convertSuggestion?: (
    id: string,
    input: ConvertReplenishmentSuggestionInput,
  ) => Promise<ConvertResult>;
  canManage?: boolean;
};

type ConvertFormState = {
  requestNo: string;
  requesterName: string;
  departmentName: string;
  expectedArrivalDate: string;
};

async function defaultLoadSuggestions(): Promise<ReplenishmentSuggestionDto[]> {
  const payload = await requestJson<{
    replenishmentSuggestions: ReplenishmentSuggestionDto[];
  }>(`${apiBaseUrl}/api/replenishment-suggestions?status=open`);
  return payload.replenishmentSuggestions;
}

async function defaultGenerateSuggestions(): Promise<GenerateReplenishmentSuggestionsResult> {
  const payload = await requestJson<{
    result: GenerateReplenishmentSuggestionsResult;
  }>(`${apiBaseUrl}/api/replenishment-suggestions/generate`, {
    method: "POST",
  });
  return payload.result;
}

async function defaultUpdateSuggestion(
  id: string,
  input: UpdateReplenishmentSuggestionInput,
): Promise<ReplenishmentSuggestionDto> {
  const payload = await requestJson<{
    replenishmentSuggestion: ReplenishmentSuggestionDto;
  }>(`${apiBaseUrl}/api/replenishment-suggestions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.replenishmentSuggestion;
}

async function defaultConvertSuggestion(
  id: string,
  input: ConvertReplenishmentSuggestionInput,
): Promise<ConvertResult> {
  return requestJson<ConvertResult>(
    `${apiBaseUrl}/api/replenishment-suggestions/${id}/convert-to-purchase-request`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function ReplenishmentSuggestionsWorkspace({
  loadSuggestions = defaultLoadSuggestions,
  generateSuggestions = defaultGenerateSuggestions,
  updateSuggestion = defaultUpdateSuggestion,
  convertSuggestion = defaultConvertSuggestion,
  canManage = true,
}: ReplenishmentSuggestionsWorkspaceProps) {
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestionDto[]>(
    [],
  );
  const [convertedRequests, setConvertedRequests] = useState<
    PurchaseRequestDto[]
  >([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionStatus, setActionStatus] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const [form, setForm] = useState<ConvertFormState>({
    requestNo: "",
    requesterName: "",
    departmentName: "",
    expectedArrivalDate: "",
  });

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    loadSuggestions()
      .then((nextSuggestions) => {
        if (!mounted) return;
        setSuggestions(nextSuggestions);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [loadSuggestions]);

  const openSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === "open"),
    [suggestions],
  );
  const suggestedQuantityTotal = openSuggestions.reduce(
    (sum, item) => sum + item.suggestedQuantity,
    0,
  );

  async function handleGenerate() {
    setActionStatus("saving");
    try {
      const result = await generateSuggestions();
      const byId = new Map(
        suggestions.map((suggestion) => [suggestion.id, suggestion]),
      );
      for (const suggestion of [...result.created, ...result.existingOpen]) {
        byId.set(suggestion.id, suggestion);
      }
      setSuggestions(Array.from(byId.values()));
      setActionStatus("idle");
    } catch {
      setActionStatus("error");
    }
  }

  async function handleDismiss(id: string) {
    setActionStatus("saving");
    try {
      const updated = await updateSuggestion(id, {
        status: "dismissed",
        remark: "暂不采购",
      });
      setSuggestions((current) =>
        current.map((suggestion) =>
          suggestion.id === id ? updated : suggestion,
        ),
      );
      setActionStatus("idle");
    } catch {
      setActionStatus("error");
    }
  }

  async function handleConvert(
    event: FormEvent<HTMLFormElement>,
    suggestionId: string,
  ) {
    event.preventDefault();
    setActionStatus("saving");
    try {
      const result = await convertSuggestion(suggestionId, {
        requestNo: form.requestNo,
        requesterName: form.requesterName,
        departmentName: form.departmentName,
        expectedArrivalDate: form.expectedArrivalDate || null,
        purpose: "库存补货建议",
      });
      setSuggestions((current) =>
        current.map((suggestion) =>
          suggestion.id === suggestionId
            ? result.replenishmentSuggestion
            : suggestion,
        ),
      );
      setConvertedRequests((current) => [result.purchaseRequest, ...current]);
      setForm({
        requestNo: "",
        requesterName: "",
        departmentName: "",
        expectedArrivalDate: "",
      });
      setActionStatus("idle");
    } catch {
      setActionStatus("error");
    }
  }

  const summary = (
    <div className="summary-grid" aria-label="补货建议摘要">
      <SummaryCard
        label="待确认建议"
        value={openSuggestions.length}
        detail="需要人工判断"
        tone={openSuggestions.length > 0 ? "warning" : "success"}
      />
      <SummaryCard
        label="建议补货数量"
        value={suggestedQuantityTotal}
        detail="按开放建议合计"
        tone="info"
      />
      <SummaryCard
        label="已转采购需求"
        value={convertedRequests.length}
        detail="本次页面操作结果"
        tone="success"
      />
    </div>
  );

  return (
    <WorkspaceScaffold
      eyebrow="库存风险"
      title="补货建议"
      subtitle="低库存先生成补货建议，人工确认后再转采购需求。"
      actions={
        canManage ? (
          <button
            className="primary-action"
            type="button"
            onClick={handleGenerate}
            disabled={actionStatus === "saving"}
          >
            <RotateCw aria-hidden="true" size={16} />
            生成补货建议
          </button>
        ) : null
      }
      summary={summary}
    >
      <section
        className="purchase-workspace replenishment-workspace"
        aria-label="补货建议"
      >
        {status === "loading" ? (
          <StateMessage icon={<RefreshCw size={18} />} text="加载补货建议..." />
        ) : null}
        {status === "error" ? <StateMessage text="补货建议加载失败" /> : null}
        {actionStatus === "error" ? (
          <StateMessage text="补货建议操作失败" />
        ) : null}
        {status === "ready" && openSuggestions.length === 0 ? (
          <StateMessage text="暂无待确认补货建议" />
        ) : null}

        <SectionCard title="待确认补货建议">
          {openSuggestions.map((suggestion) => (
            <form
              className="dashboard-panel replenishment-card"
              key={suggestion.id}
              onSubmit={(event) => handleConvert(event, suggestion.id)}
            >
              <div>
                <strong>{suggestion.materialCode}</strong>
                <h3>{suggestion.materialName}</h3>
                <p>
                  {suggestion.warehouseName} / 当前 {suggestion.currentStock}{" "}
                  {suggestion.unit} / 安全库存 {suggestion.safeStock}{" "}
                  {suggestion.unit}
                </p>
              </div>
              <span className="suggestion-quantity">
                建议 {suggestion.suggestedQuantity} {suggestion.unit}
              </span>
              <label>
                <span>采购需求编号</span>
                <input
                  required
                  value={form.requestNo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestNo: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>申请人</span>
                <input
                  required
                  value={form.requesterName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requesterName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>申请部门</span>
                <input
                  required
                  value={form.departmentName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departmentName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>期望到货日期</span>
                <input
                  type="date"
                  value={form.expectedArrivalDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expectedArrivalDate: event.target.value,
                    }))
                  }
                />
              </label>
              {canManage ? (
                <div className="replenishment-actions">
                  <button
                    type="button"
                    onClick={() => handleDismiss(suggestion.id)}
                    disabled={actionStatus === "saving"}
                  >
                    <XCircle aria-hidden="true" size={15} />
                    忽略
                  </button>
                  <button type="submit" disabled={actionStatus === "saving"}>
                    <Send aria-hidden="true" size={15} />
                    转采购需求
                  </button>
                </div>
              ) : null}
            </form>
          ))}
        </SectionCard>

        {convertedRequests.map((request) => (
          <p className="conversion-result" key={request.id}>
            已转采购需求：{request.requestNo}
          </p>
        ))}
      </section>
    </WorkspaceScaffold>
  );
}

function StateMessage({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="party-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}
