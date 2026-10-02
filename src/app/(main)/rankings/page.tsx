"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, tierColor, tierName, movementIcon, movementClass, fmtWinRate } from "@/src/lib/utils";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { Pagination } from "@/src/components/ui/Pagination";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { EmptyState } from "@/src/components/ui/EmptyState";
import type { RankedPlayer, PaginatedResponse } from "@/src/types";

const REGIONS = ["", "NA", "EU", "ASIA", "OCE", "SA", "OTHER"];
const TIERS   = ["", "ACADEMY", "GENIN", "CHUNIN", "JONIN", "KAGE", "BLOODLINE_LEGEND"];
const SORTS   = [
  { value: "rating",  label: "Rating" },
  { value: "winRate", label: "Win Rate" },
  { value: "wins",    label: "Wins" },
  { value: "streak",  label: "Streak" },
  { value: "matches", label: "Matches" },
];

export default function RankingsPage() {
  const [region, setRegion] = useState("");
  const [tier, setTier]     = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [page, setPage]     = useState(1);
  const [data, setData]     = useState<PaginatedResponse<RankedPlayer> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: "50", sortBy });
    if (region) qs.set("region", region);
    if (tier)   qs.set("tier", tier);
    apiFetch<PaginatedResponse<RankedPlayer>>(`/api/rankings?${qs}`).then(res => {
      setLoading(false);
      if (!("error" in res)) setData(res.data);
    });
  }, [region, tier, sortBy, page]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  // Reset to page 1 when filters change
  function applyFilter(fn: () => void) { fn(); setPage(1); }

  return (
    <div className="space-y-6">
      <div className="bl-page-header">
        <div>
          <h1 className="bl-page-title">Rankings</h1>
          <p className="bl-page-sub">Live leaderboard — sorted by {SORTS.find(s => s.value === sortBy)?.label}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bl-card bl-card-body flex flex-wrap gap-3 items-center">
        <div className="bl-form-group flex-row items-center gap-2 !gap-2">
          <label className="bl-label !mb-0 whitespace-nowrap">Region</label>
          <select className="bl-select w-32" value={region}
            onChange={e => applyFilter(() => setRegion(e.target.value))}>
            {REGIONS.map(r => <option key={r} value={r}>{r || "All"}</option>)}
          </select>
        </div>
        <div className="bl-form-group flex-row items-center gap-2 !gap-2">
          <label className="bl-label !mb-0 whitespace-nowrap">Tier</label>
          <select className="bl-select w-40" value={tier}
            onChange={e => applyFilter(() => setTier(e.target.value))}>
            {TIERS.map(t => <option key={t} value={t}>{t ? tierName(t) : "All"}</option>)}
          </select>
        </div>
        <div className="bl-form-group flex-row items-center gap-2 !gap-2">
          <label className="bl-label !mb-0 whitespace-nowrap">Sort by</label>
          <select className="bl-select w-36" value={sortBy}
            onChange={e => applyFilter(() => setSortBy(e.target.value))}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {(region || tier) && (
          <button onClick={() => applyFilter(() => { setRegion(""); setTier(""); })}
            className="bl-btn bl-btn-ghost bl-btn-sm text-xs">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bl-card overflow-x-auto">
        {loading ? <PageSpinner /> : !data || data.items.length === 0
          ? <EmptyState message="No players found" />
          : <>
            <table className="bl-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th className="w-8"></th>
                  <th>Player</th>
                  <th>Tier</th>
                  <th className="text-right">Rating</th>
                  <th className="text-right">Peak</th>
                  <th className="text-right">W</th>
                  <th className="text-right">L</th>
                  <th className="text-right">Win%</th>
                  <th className="text-right">Streak</th>
                  <th className="hidden lg:table-cell">Team</th>
                  <th className="hidden lg:table-cell">Region</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(row => {
                  const col = tierColor(row.player.tier);
                  return (
                    <tr key={row.player.id}>
                      <td className="font-mono text-brand-dim">{row.rank}</td>
                      <td className={`text-xs font-bold ${movementClass(row.movement)}`}>
                        {movementIcon(row.movement)}
                      </td>
                      <td>
                        <Link href={`/players/${row.player.id}`}
                          className="font-medium text-brand-text hover:text-brand-accent transition-colors">
                          {row.player.displayName}
                        </Link>
                        <span className="text-brand-dim text-xs ml-2 hidden sm:inline">@{row.player.username}</span>
                      </td>
                      <td><TierBadge tier={row.player.tier} size="sm" /></td>
                      <td className="text-right font-bold tabular-nums" style={{ color: col }}>
                        {row.player.rating}
                      </td>
                      <td className="text-right tabular-nums text-brand-dim text-sm">{row.player.peakRating}</td>
                      <td className="text-right tabular-nums text-green-400">{row.player.wins}</td>
                      <td className="text-right tabular-nums text-red-400">{row.player.losses}</td>
                      <td className="text-right tabular-nums text-brand-dim">
                        {fmtWinRate(row.player.wins, row.player.totalMatches)}
                      </td>
                      <td className={`text-right tabular-nums font-semibold ${row.player.currentStreak > 0 ? "text-green-400" : row.player.currentStreak < 0 ? "text-red-400" : "text-brand-dim"}`}>
                        {row.player.currentStreak > 0 ? `+${row.player.currentStreak}` : row.player.currentStreak}
                      </td>
                      <td className="hidden lg:table-cell text-brand-dim text-sm">
                        {row.player.teamName ?? "—"}
                      </td>
                      <td className="hidden lg:table-cell text-brand-dim text-sm">{row.player.region}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3">
              <Pagination {...data.pagination} onPage={setPage} />
            </div>
          </>
        }
      </div>
    </div>
  );
}
