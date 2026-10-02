"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDateTime } from "@/src/lib/utils";

interface MatchRow {
  id: string;
  format: string;
  status: string;
  completedAt: string | null;
  scheduledAt: string | null;
  map: { name: string } | null;
  participants: { score: number | null; player: { id: string; displayName: string; username: string } }[];
}
interface MatchResponse { items: MatchRow[]; pagination: { total: number } }

export default function MatchesPage() {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiFetch<MatchResponse>("/api/matches?page=1&pageSize=50&status=COMPLETED").then((result) => {
      if ("error" in result) setError(true);
      else setData(result.data);
    }).catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bl-page-header flex-col sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Competition</p>
          <h1 className="bl-page-title text-3xl">Matches</h1>
        </div>
        {data && <Badge className="bg-brand-accent/10 text-brand-accent">{data.pagination.total} completed</Badge>}
      </div>
      {error ? <div className="bl-alert-error">Match data could not be loaded. Please try again later.</div> : !data ? <PageSpinner /> : data.items.length === 0 ? <div className="bl-card"><EmptyState message="No completed matches yet" sub="Match results will appear here after they are recorded." /></div> : <div className="space-y-4">{data.items.map((match) => {
        const [first, second] = match.participants;
        return <Link key={match.id} href={`/matches/${match.id}`} className="bl-card block p-5 transition-colors hover:border-brand-accent/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-gray-800 text-gray-300">{match.status}</Badge>
                <span className="text-sm text-brand-dim">{match.format}</span>
                <span className="text-sm text-brand-dim">· {match.map?.name ?? "Map unavailable"}</span>
              </div>
              <div className="text-xl font-bold text-brand-text">{first?.player.displayName ?? "Player"} {first?.score ?? "–"} - {second?.score ?? "–"} {second?.player.displayName ?? "Player"}</div>
            </div>
            <div className="text-sm text-brand-dim lg:text-right">
              <div>{fmtDateTime(match.completedAt ?? match.scheduledAt)}</div>
              <div className="mt-1">Match {match.id.slice(-8)}</div>
            </div>
          </div>
        </Link>;
      })}</div>}
    </div>
  );
}
