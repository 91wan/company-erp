import { useEffect, useState } from "react";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

function PageJump({ page, pageCount, onJump }: { page: number; pageCount: number; onJump: (page: number) => void }) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);
  const commit = () => {
    const next = Number(draft);
    if (Number.isFinite(next) && draft.trim()) onJump(next);
    else setDraft(String(page));
  };
  return (
    <label className="workspace-pagination-jump">
      第
      <input
        type="number"
        min={1}
        max={pageCount}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        onBlur={commit}
        aria-label="跳转到页码"
      />
      / {pageCount} 页
    </label>
  );
}

export function ListPaginationBar({
  total,
  page,
  pageCount,
  pageSize,
  refetching,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onJump,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  refetching: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="workspace-pagination">
      <span className="workspace-pagination-summary">
        共 {total} 条{refetching ? " · 更新中…" : ""}
      </span>
      <div className="workspace-pagination-controls">
        <label className="workspace-pagination-size">
          每页
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} aria-label="每页条数">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          条
        </label>
        <button type="button" onClick={onPrev} disabled={!canPrev}>
          上一页
        </button>
        <PageJump page={page} pageCount={pageCount} onJump={onJump} />
        <button type="button" onClick={onNext} disabled={!canNext}>
          下一页
        </button>
      </div>
    </div>
  );
}
