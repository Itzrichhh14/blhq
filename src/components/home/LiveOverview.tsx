"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/utils";

interface PageResult { pagination: { total: number } }
interface RankingResult { items: { player: { displayName: string; tier: string; rating: number; wins: number; losses: number } }[] }
interface Season { name: string; status: string }
interface Overview {
  players: number;
  matches: number;
  tournaments: number;
  seasons: number;
  leader: RankingResult["items"][number]["player"] | null;
  activeSeason: string | null;
}

export function LiveOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  useEffect(() => {
    async function load() {
      const [players, matches, tournaments, seasons, rankings] = await Promise.all([
        apiFetch<PageResult>("/api/players?page=1&pageSize=1"),
        apiFetch<PageResult>("/api/matches?page=1&pageSize=1"),
        apiFetch<PageResult>("/api/tournaments?page=1&pageSize=1"),
        apiFetch<Season[]>("/api/seasons"),
        apiFetch<RankingResult>("/api/rankings?page=1&pageSize=1"),
      ]);
      if ([players, matches, tournaments, seasons, rankings].some((result) => "error" in result)) return;
      if ("error" in players || "error" in matches || "error" in tournaments || "error" in seasons || "error" in rankings) return;
      setOverview({
        players: players.data.pagination.total,
        matches: matches.data.pagination.total,
        tournaments: tournaments.data.pagination.total,
        seasons: seasons.data.length,
        leader: rankings.data.items[0]?.player ?? null,
        activeSeason: seasons.data.find((season) => season.status === "ACTIVE")?.name ?? null,
      });
    }
    load().catch(() => setOverview(null));
  }, []);

  const stats = [
    { label: "Players", value: overview?.players.toLocaleString() ?? "—" },
    { label: "Matches", value: overview?.matches.toLocaleString() ?? "—" },
    { label: "Tournaments", value: overview?.tournaments.toLocaleString() ?? "—" },
    { label: "Seasons", value: overview?.seasons.toLocaleString() ?? "—" },
  ];

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => <div key={item.label} className="bl-card p-4"><div className="text-2xl font-black text-brand-text">{item.value}</div><div className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-dim">{item.label}</div></div>)}
    </div>
    <div className="bl-card overflow-hidden">
      <div className="border-b border-brand-border bg-brand-surface p-5"><div className="flex items-center justify-between text-sm text-brand-dim"><span>Current season</span><span className="rounded-full bg-brand-accent/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">{overview?.activeSeason ? "Active" : "No active season"}</span></div><h2 className="mt-3 text-3xl font-black text-brand-text">{overview?.activeSeason ?? "Season standings"}</h2></div>
      <div className="space-y-4 p-5">
        {overview?.leader ? <div className="rounded-lg border border-brand-border bg-brand-muted/40 p-4"><div className="flex items-center justify-between text-sm text-brand-dim"><span>Top ranked</span><span className="text-brand-accent">{overview.leader.tier.replaceAll("_", " ")}</span></div><div className="mt-2 text-xl font-bold text-brand-text">{overview.leader.displayName}</div><div className="mt-2 text-sm text-brand-dim">Rating {overview.leader.rating} · {overview.leader.wins} wins · {overview.leader.losses} losses</div></div> : <div className="rounded-lg border border-brand-border bg-brand-muted/40 p-4 text-sm text-brand-dim">Rankings will appear when active player profiles are available.</div>}
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-brand-border bg-brand-surface p-4"><div className="text-xs uppercase tracking-[0.2em] text-brand-dim">Live events</div><div className="mt-3 text-2xl font-black text-brand-text">{overview?.tournaments ?? "—"}</div></div><div className="rounded-lg border border-brand-border bg-brand-surface p-4"><div className="text-xs uppercase tracking-[0.2em] text-brand-dim">Recorded matches</div><div className="mt-3 text-2xl font-black text-brand-text">{overview?.matches ?? "—"}</div></div></div>
      </div>
    </div>
  </>;
}
