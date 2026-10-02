"use client";

interface EmptyStateProps {
  message: string;
  sub?: string;
}

export function EmptyState({ message, sub }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3 opacity-30">—</div>
      <p className="text-brand-dim font-medium">{message}</p>
      {sub && <p className="text-brand-dim/60 text-sm mt-1">{sub}</p>}
    </div>
  );
}
