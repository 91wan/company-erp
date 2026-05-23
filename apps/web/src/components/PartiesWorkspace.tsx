import { Building2, Filter, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PARTY_METADATA,
  type CreatePartyInput,
  type PartyDto,
  type PartyTypeCode,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../apiClient";
import { FormDrawer, SectionCard, StatusBadge, SummaryCard, Toolbar, WorkspaceScaffold } from "./ui";

type PartiesWorkspaceProps = {
  loadParties?: () => Promise<PartyDto[]>;
  createParty?: (input: CreatePartyInput) => Promise<PartyDto>;
  canManage?: boolean;
  initialEntityId?: string;
};

async function defaultLoadParties(): Promise<PartyDto[]> {
  const payload = await requestJson<{ parties: PartyDto[] }>(`${apiBaseUrl}/api/parties`);
  return payload.parties;
}

async function defaultCreateParty(input: CreatePartyInput): Promise<PartyDto> {
  const payload = await requestJson<{ party: PartyDto }>(`${apiBaseUrl}/api/parties`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.party;
}

const typeLabel = new Map(PARTY_METADATA.partyTypes.map((partyType) => [partyType.code, partyType.label]));
const statusLabel = new Map(PARTY_METADATA.statuses.map((status) => [status.code, status.label]));

export function PartiesWorkspace({
  loadParties = defaultLoadParties,
  createParty = defaultCreateParty,
  canManage = true,
  initialEntityId,
}: PartiesWorkspaceProps) {
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | PartyTypeCode>("all");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [form, setForm] = useState<CreatePartyInput>({
    partyCode: "",
    partyName: "",
    partyTypes: ["supplier"],
    status: "enabled",
  });

  useEffect(() => {
    let mounted = true;

    setStatus("loading");
    loadParties()
      .then((nextParties) => {
        if (!mounted) return;
        setParties(nextParties);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [loadParties]);

  useEffect(() => {
    if (initialEntityId) setQuery(initialEntityId);
  }, [initialEntityId]);

  const filteredParties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return parties.filter((party) => {
      const matchesType = typeFilter === "all" || party.partyTypes.includes(typeFilter);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [party.partyCode, party.partyName, party.primaryContactName, party.primaryContactPhone]
          .concat(party.id)
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));

      return matchesType && matchesQuery;
    });
  }, [parties, query, typeFilter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");

    try {
      const created = await createParty(form);
      setParties((current) => [created, ...current.filter((party) => party.id !== created.id)]);
      setForm({ partyCode: "", partyName: "", partyTypes: ["supplier"], status: "enabled" });
      setIsCreateDrawerOpen(false);
      setSubmitState("idle");
    } catch {
      setSubmitState("error");
    }
  }

  function toggleType(partyType: PartyTypeCode) {
    setForm((current) => {
      const hasType = current.partyTypes.includes(partyType);
      const nextTypes = hasType
        ? current.partyTypes.filter((value) => value !== partyType)
        : [...current.partyTypes, partyType];

      return {
        ...current,
        partyTypes: nextTypes.length > 0 ? nextTypes : current.partyTypes,
      };
    });
  }

  const summary = (
    <div className="summary-grid" aria-label="往来方指标摘要">
      {PARTY_METADATA.partyTypes.map((partyType) => {
        const count = parties.filter((party) => party.partyTypes.includes(partyType.code)).length;
        return <SummaryCard key={partyType.code} label={partyType.label} value={count} detail="往来单位分类" tone="neutral" />;
      })}
    </div>
  );

  return (
    <WorkspaceScaffold
      eyebrow="基础资料"
      title="往来单位"
      subtitle="统一维护客户、供应商、分包主体、个人承包人和运营主体。"
      actions={(
        <>
          <span className="parties-total">
            <Building2 aria-hidden="true" size={18} />
            {parties.length} 个往来方
          </span>
          {canManage ? (
            <button type="button" className="primary-action" onClick={() => setIsCreateDrawerOpen(true)}>
              新增往来方
            </button>
          ) : null}
        </>
      )}
      summary={summary}
    >
      <section className="parties-workspace" aria-label="往来方基础资料">
        <SectionCard title="往来单位台账">
          {initialEntityId ? (
            <div className="workspace-state workspace-state--info" role="status">
              <span>已跳转往来方台账，请核查记录 ID：{initialEntityId}。</span>
            </div>
          ) : null}
          <Toolbar
            search={(
              <label className="table-search">
                <Search aria-hidden="true" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索编码、名称、联系人、电话"
                />
              </label>
            )}
            filters={(
              <label className="table-filter">
                <Filter aria-hidden="true" size={16} />
                <select
                  aria-label="往来方类型筛选"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as "all" | PartyTypeCode)}
                >
                  <option value="all">全部类型</option>
                  {PARTY_METADATA.partyTypes.map((partyType) => (
                    <option key={partyType.code} value={partyType.code}>
                      {partyType.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          />

          {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载往来方资料..." /> : null}
          {status === "error" ? <StateMessage text="往来方资料加载失败" /> : null}
          {status === "ready" && filteredParties.length === 0 ? <StateMessage text="暂无往来方资料" /> : null}
          {status === "ready" && filteredParties.length > 0 ? <PartiesTable parties={filteredParties} /> : null}
        </SectionCard>
      </section>
      <FormDrawer
        title="新增往来方"
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
      >
        <form className="dashboard-panel party-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <h3>新增往来方</h3>
            <button type="submit" disabled={submitState === "saving"}>
              <Save aria-hidden="true" size={15} />
              保存往来方
            </button>
          </div>

          <label>
            <span>往来方编码</span>
            <input
              required
              value={form.partyCode}
              onChange={(event) => setForm((current) => ({ ...current, partyCode: event.target.value }))}
            />
          </label>
          <label>
            <span>往来方名称</span>
            <input
              required
              value={form.partyName}
              onChange={(event) => setForm((current) => ({ ...current, partyName: event.target.value }))}
            />
          </label>

          <fieldset>
            <legend>往来方类型</legend>
            {PARTY_METADATA.partyTypes.map((partyType) => (
              <label key={partyType.code} className="party-type-check">
                <input
                  type="checkbox"
                  checked={form.partyTypes.includes(partyType.code)}
                  onChange={() => toggleType(partyType.code)}
                />
                <span>{partyType.label}</span>
              </label>
            ))}
          </fieldset>

          <label>
            <span>主联系人</span>
            <input
              value={form.primaryContactName ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, primaryContactName: event.target.value || null }))
              }
            />
          </label>
          <label>
            <span>联系电话</span>
            <input
              value={form.primaryContactPhone ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, primaryContactPhone: event.target.value || null }))
              }
            />
          </label>
          <label>
            <span>供应类别</span>
            <select
              value={form.supplyCategory ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, supplyCategory: event.target.value || null }))}
            >
              <option value="">不设置</option>
              {PARTY_METADATA.supplyCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          {submitState === "error" ? <p className="form-error">保存失败，请检查编码是否重复或稍后重试。</p> : null}
        </form>
      </FormDrawer>
    </WorkspaceScaffold>
  );
}

function PartiesTable({ parties }: { parties: PartyDto[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>编码</th>
            <th>名称</th>
            <th>类型</th>
            <th>联系方式</th>
            <th>状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          {parties.map((party) => (
            <tr key={party.id}>
              <td>{party.partyCode}</td>
              <td>{party.partyName}</td>
              <td>
                <div className="type-tags">
                  {party.partyTypes.map((partyType) => (
                    <span key={partyType}>{typeLabel.get(partyType)}</span>
                  ))}
                </div>
              </td>
              <td>
                {party.primaryContactName || "-"}
                <small>{party.primaryContactPhone || "未设置电话"}</small>
              </td>
              <td>
                <StatusBadge tone={party.status === "enabled" ? "success" : "disabled"}>
                  {statusLabel.get(party.status)}
                </StatusBadge>
              </td>
              <td>{formatDateTime(party.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
