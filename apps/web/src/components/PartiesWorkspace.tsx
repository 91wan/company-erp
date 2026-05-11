import { Building2, Filter, Plus, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PARTY_METADATA,
  type CreatePartyInput,
  type PartyDto,
  type PartyTypeCode,
} from "@company-erp/shared";

type PartiesWorkspaceProps = {
  loadParties?: () => Promise<PartyDto[]>;
  createParty?: (input: CreatePartyInput) => Promise<PartyDto>;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function defaultLoadParties(): Promise<PartyDto[]> {
  const response = await fetch(`${apiBaseUrl}/api/parties`);

  if (!response.ok) {
    throw new Error(`Parties request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { parties: PartyDto[] };
  return payload.parties;
}

async function defaultCreateParty(input: CreatePartyInput): Promise<PartyDto> {
  const response = await fetch(`${apiBaseUrl}/api/parties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Party create failed with ${response.status}`);
  }

  const payload = (await response.json()) as { party: PartyDto };
  return payload.party;
}

const typeLabel = new Map(PARTY_METADATA.partyTypes.map((partyType) => [partyType.code, partyType.label]));
const statusLabel = new Map(PARTY_METADATA.statuses.map((status) => [status.code, status.label]));

export function PartiesWorkspace({
  loadParties = defaultLoadParties,
  createParty = defaultCreateParty,
}: PartiesWorkspaceProps) {
  const [parties, setParties] = useState<PartyDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | PartyTypeCode>("all");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
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

  const filteredParties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return parties.filter((party) => {
      const matchesType = typeFilter === "all" || party.partyTypes.includes(typeFilter);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [party.partyCode, party.partyName, party.primaryContactName, party.primaryContactPhone]
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

  return (
    <section className="parties-workspace" aria-label="往来方基础资料">
      <div className="parties-heading">
        <div>
          <span className="section-kicker">基础资料</span>
          <h2>往来方基础</h2>
          <p>统一维护供应商、甲方客户/服务单位、外包方和我方公司主体。</p>
        </div>
        <span className="parties-total">
          <Building2 aria-hidden="true" size={18} />
          {parties.length} 个往来方
        </span>
      </div>

      <div className="party-summary" aria-label="往来方指标摘要">
        {PARTY_METADATA.partyTypes.map((partyType) => {
          const count = parties.filter((party) => party.partyTypes.includes(partyType.code)).length;
          return (
            <article key={partyType.code}>
              <span>{partyType.label}</span>
              <strong>{count}</strong>
            </article>
          );
        })}
      </div>

      <div className="parties-layout">
        <section className="dashboard-panel table-panel">
          <div className="party-toolbar">
            <label className="party-search">
              <Search aria-hidden="true" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索编码、名称、联系人、电话"
              />
            </label>
            <label className="party-filter">
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
          </div>

          {status === "loading" ? <StateMessage icon={<RefreshCw size={18} />} text="加载往来方资料..." /> : null}
          {status === "error" ? <StateMessage text="往来方资料加载失败" /> : null}
          {status === "ready" && filteredParties.length === 0 ? <StateMessage text="暂无往来方资料" /> : null}
          {status === "ready" && filteredParties.length > 0 ? <PartiesTable parties={filteredParties} /> : null}
        </section>

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
      </div>
    </section>
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
            <th>联系人</th>
            <th>电话</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
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
              <td>{party.primaryContactName || "-"}</td>
              <td>{party.primaryContactPhone || "-"}</td>
              <td>
                <span className={`status-badge ${party.status === "enabled" ? "green" : "orange"}`}>
                  {statusLabel.get(party.status)}
                </span>
              </td>
              <td>{formatDateTime(party.updatedAt)}</td>
              <td>
                <button type="button" className="table-action">
                  <Plus aria-hidden="true" size={14} />
                  编辑
                </button>
              </td>
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
