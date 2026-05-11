import { RefreshCw, RotateCw, Send, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type {
  ConvertReplenishmentSuggestionInput,
  GenerateReplenishmentSuggestionsResult,
  PurchaseRequestDto,
  ReplenishmentSuggestionDto,
  UpdateReplenishmentSuggestionInput,
} from "@company-erp/shared";

type ConvertResult = {
  replenishmentSuggestion: ReplenishmentSuggestionDto;
  purchaseRequest: PurchaseRequestDto;
};

type ReplenishmentSuggestionsWorkspaceProps = {
  loadSuggestions?: () => Promise<ReplenishmentSuggestionDto[]>;
  generateSuggestions?: () => Promise<GenerateReplenishmentSuggestionsResult>;
  updateSuggestion?: (id: string, input: UpdateReplenishmentSuggestionInput) => Promise<ReplenishmentSuggestionDto>;
  convertSuggestion?: (id: string, input: ConvertReplenishmentSuggestionInput) => Promise<ConvertResult>;
};

type ConvertFormState = {
  requestNo: string;
  requesterName: string;
  departmentName: string;
  expectedArrivalDate: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function defaultLoadSuggestions(): Promise<ReplenishmentSuggestionDto[]> {
  const response = await fetch(`${apiBaseUrl}/api/replenishment-suggestions?status=open`);
  if (!response.ok) throw new Error(`Replenishment suggestions failed with ${response.status}`);
  const payload = (await response.json()) as { replenishmentSuggestions: ReplenishmentSuggestionDto[] };
  return payload.replenishmentSuggestions;
}

async function defaultGenerateSuggestions(): Promise<GenerateReplenishmentSuggestionsResult> {
  const response = await fetch(`${apiBaseUrl}/api/replenishment-suggestions/generate`, { method: "POST" });
  if (!response.ok) throw new Error(`Replenishment generate failed with ${response.status}`);
  const payload = (await response.json()) as { result: GenerateReplenishmentSuggestionsResult };
  return payload.result;
}

async function defaultUpdateSuggestion(
  id: string,
  input: UpdateReplenishmentSuggestionInput,
): Promise<ReplenishmentSuggestionDto> {
  const response = await fetch(`${apiBaseUrl}/api/replenishment-suggestions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Replenishment update failed with ${response.status}`);
  const payload = (await response.json()) as { replenishmentSuggestion: ReplenishmentSuggestionDto };
  return payload.replenishmentSuggestion;
}

async function defaultConvertSuggestion(
  id: string,
  input: ConvertReplenishmentSuggestionInput,
): Promise<ConvertResult> {
  const response = await fetch(`${apiBaseUrl}/api/replenishment-suggestions/${id}/convert-to-purchase-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Replenishment convert failed with ${response.status}`);
  return (await response.json()) as ConvertResult;
}

export function ReplenishmentSuggestionsWorkspace({
  loadSuggestions = defaultLoadSuggestions,
  generateSuggestions = defaultGenerateSuggestions,
  updateSuggestion = defaultUpdateSuggestion,
  convertSuggestion = defaultConvertSuggestion,
}: ReplenishmentSuggestionsWorkspaceProps) {
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestionDto[]>([]);
  const [convertedRequests, setConvertedRequests] = useState<PurchaseRequestDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [actionStatus, setActionStatus] = useState<"idle" | "saving" | "error">("idle");
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
  const suggestedQuantityTotal = openSuggestions.reduce((sum, item) => sum + item.suggestedQuantity, 0);

  async function handleGenerate() {
    setActionStatus("saving");
    try {
      const result = await generateSuggestions();
      const byId = new Map(suggestions.map((suggestion) => [suggestion.id, suggestion]));
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
      const updated = await updateSuggestion(id, { status: "dismissed", remark: "暂不采购" });
      setSuggestions((current) => current.map((suggestion) => (suggestion.id === id ? updated : suggestion)));
      setActionStatus("idle");
    } catch {
      setActionStatus("error");
    }
  }

  async function handleConvert(event: FormEvent<HTMLFormElement>, suggestionId: string) {
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
        current.map((suggestion) => (suggestion.id === suggestionId ? result.replenishmentSuggestion : suggestion)),
      );
      setConvertedRequests((current) => [result.purchaseRequest, ...current]);
      setForm({ requestNo: "", requesterName: "", departmentName: "", expectedArrivalDate: "" });
      setActionStatus("idle");
    } catch {
      setActionStatus("error");
    }
  }

  return (
    <section className="purchase-workspace replenishment-workspace" aria-label="补货建议">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">库存</span>
          <h2>补货建议</h2>
          <p>低库存先生成补货建议，人工确认后再转采购需求。</p>
        </div>
        <button className="primary-action" type="button" onClick={handleGenerate} disabled={actionStatus === "saving"}>
          <RotateCw aria-hidden="true" size={16} />
          生成补货建议
        </button>
      </div>

      <div className="party-summary material-summary" aria-label="补货建议摘要">
        <SummaryCard label="待确认建议" value={openSuggestions.length} suffix="条" />
        <SummaryCard label="建议补货数量" value={suggestedQuantityTotal} />
        <SummaryCard label="已转采购需求" value={convertedRequests.length} suffix="条" />
      </div>

      {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载补货建议..." /> : null}
      {status === "error" ? <StateMessage text="补货建议加载失败" /> : null}
      {actionStatus === "error" ? <StateMessage text="补货建议操作失败" /> : null}
      {status === "ready" && openSuggestions.length === 0 ? <StateMessage text="暂无待确认补货建议" /> : null}

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
              {suggestion.warehouseName} / 当前 {suggestion.currentStock} {suggestion.unit} / 安全库存{" "}
              {suggestion.safeStock} {suggestion.unit}
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
              onChange={(event) => setForm((current) => ({ ...current, requestNo: event.target.value }))}
            />
          </label>
          <label>
            <span>申请人</span>
            <input
              required
              value={form.requesterName}
              onChange={(event) => setForm((current) => ({ ...current, requesterName: event.target.value }))}
            />
          </label>
          <label>
            <span>申请部门</span>
            <input
              required
              value={form.departmentName}
              onChange={(event) => setForm((current) => ({ ...current, departmentName: event.target.value }))}
            />
          </label>
          <label>
            <span>期望到货日期</span>
            <input
              type="date"
              value={form.expectedArrivalDate}
              onChange={(event) => setForm((current) => ({ ...current, expectedArrivalDate: event.target.value }))}
            />
          </label>
          <div className="replenishment-actions">
            <button type="button" onClick={() => handleDismiss(suggestion.id)} disabled={actionStatus === "saving"}>
              <XCircle aria-hidden="true" size={15} />
              忽略
            </button>
            <button type="submit" disabled={actionStatus === "saving"}>
              <Send aria-hidden="true" size={15} />
              转采购需求
            </button>
          </div>
        </form>
      ))}

      {convertedRequests.map((request) => (
        <p className="conversion-result" key={request.id}>
          已转采购需求：{request.requestNo}
        </p>
      ))}
    </section>
  );
}

function SummaryCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <article aria-label={`${label} ${value}${suffix ? ` ${suffix}` : ""}`}>
      <small>{`${label} ${value}${suffix ? ` ${suffix}` : ""}`}</small>
      <span>{label}</span>
      <strong>
        {value} {suffix}
      </strong>
    </article>
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
