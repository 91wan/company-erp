/**
 * Shared list paging guard.
 *
 * Public-internet list endpoints must never return an unbounded result set. At
 * 30+ project sites the transactional tables (inventory movements, usage
 * requests, purchases…) grow without limit, so a bare `findMany` would pull the
 * whole table into one response. These helpers parse optional `limit`/`offset`
 * query params and clamp them to a safe range; when absent, a sane default cap
 * is applied so existing callers stay bounded without changing response shape.
 */
export const DEFAULT_LIST_LIMIT = 200;
export const MAX_LIST_LIMIT = 500;

export type ListPaging = { limit: number; offset: number };

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return null;
}

/**
 * Resolve `limit`/`offset` from a request query into a bounded page.
 * - `limit`: defaults to {@link DEFAULT_LIST_LIMIT}, clamped to 1..{@link MAX_LIST_LIMIT}.
 * - `offset`: defaults to 0, never negative.
 */
export function normalizeListPaging(query: Record<string, unknown>): ListPaging {
  const rawLimit = toInteger(query.limit);
  const rawOffset = toInteger(query.offset);
  const limit = rawLimit === null ? DEFAULT_LIST_LIMIT : Math.min(Math.max(rawLimit, 1), MAX_LIST_LIMIT);
  const offset = rawOffset === null ? 0 : Math.max(rawOffset, 0);
  return { limit, offset };
}
