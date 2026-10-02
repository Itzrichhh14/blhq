"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-3 border-t border-brand-border text-sm">
      <span className="text-brand-dim">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="bl-btn-ghost bl-btn-sm bl-btn disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="px-3 text-brand-dim">{page} / {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="bl-btn-ghost bl-btn-sm bl-btn disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
