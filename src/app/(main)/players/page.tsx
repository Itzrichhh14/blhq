"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtWinRate, tierColor } from "@/src/lib/utils";

interface PlayerRow {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  tier: string;
  rating: number;
  wins: number;
  losses: number;
  totalMatches: number;
  region: string;
  team: { name: string } | null;
}

interface PlayerResponse {
  items: PlayerRow[];
  pagination: { total: number };
}

export default function PlayersPage() {
  const [data, setData] = useState<PlayerResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<PlayerResponse>("/api/players?page=1&pageSize=50").then((result) => {
      if ("error" in result) setError(true);
      else setData(result.data);
    }).catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bl-page-header flex-col sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Roster</p>
          <h1 className="bl-page-title text-3xl">Players</h1>
        </div>
        {data && <Badge className="bg-brand-accent/10 text-brand-accent">{data.pagination.total} active</Badge>}
      </div>
      {error ? <div className="bl-alert-error">Player data could not be loaded. Please try again later.</div>
        : !data ? <PageSpinner />
        : data.items.length === 0 ? <div className="bl-card"><EmptyState message="No active players yet" sub="Player profiles will appear here once registered." /></div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((player, index) => (
            <Link href={`/players/${player.id}`} key={player.id} className="bl-card p-5 transition-transform hover:-translate-y-0.5 hover:border-brand-accent/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-border bg-brand-muted text-lg font-black text-brand-text">{player.avatar || player.displayName[0] || player.username[0]}</div>
                  <div><div className="text-lg font-bold text-brand-text">{player.displayName}</div><div className="text-sm text-brand-dim">@{player.username}</div></div>
                </div>
                <span className="text-xs font-bold text-brand-dim">#{index + 1}</span>
              </div>
              <div className="mt-4 flex items-center justify-between"><TierBadge tier={player.tier} size="sm" /><span className="text-2xl font-black tabular-nums" style={{ color: tierColor(player.tier) }}>{player.rating}</span></div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg border border-brand-border bg-brand-surface p-2"><div className="text-xs text-brand-dim">Wins</div><div className="mt-1 font-bold text-green-400">{player.wins}</div></div>
                <div className="rounded-lg border border-brand-border bg-brand-surface p-2"><div className="text-xs text-brand-dim">Losses</div><div className="mt-1 font-bold text-red-400">{player.losses}</div></div>
                <div className="rounded-lg border border-brand-border bg-brand-surface p-2"><div className="text-xs text-brand-dim">Win%</div><div className="mt-1 font-bold text-brand-text">{fmtWinRate(player.wins, player.totalMatches)}</div></div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-brand-dim"><span>{player.region}</span><span>{player.team?.name ?? "Independent"}</span></div>
            </Link>
          ))}
        </div>}
    </div>
  );
}
