"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { apiFetch, fmtDate } from "@/src/lib/utils";

interface SeasonDetail { id: string; name: string; number: number; status: string; startDate: string | null; endDate: string | null; _count: { matches: number; tournaments: number; playerStats: number }; leaderboard?: { items: { rank: number; rating: number; wins: number; losses: number; player: { id: string; username: string; displayName: string; avatar: string | null; tier: string; region: string } }[] } }
export default function SeasonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [season, setSeason] = useState<SeasonDetail | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiFetch<SeasonDetail>(`/api/seasons/${encodeURIComponent(id)}?include=leaderboard`).then((result) => { if ("error" in result) setError(true); else setSeason(result.data); }).catch(() => setError(true)); }, [id]);
  if (error) return <div className="bl-card p-8 text-center"><h1 className="text-2xl font-black text-brand-text">Season not found</h1><Link href="/seasons" className="mt-4 inline-block text-brand-accent">Back to seasons</Link></div>;
  if (!season) return <PageSpinner />;
  const standings = season.leaderboard?.items ?? [];
  return <div className="space-y-6"><div className="bl-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Season {season.number}</p><h1 className="mt-2 text-3xl font-black text-brand-text">{season.name}</h1></div><Badge className={season.status === "ACTIVE" ? "bg-green-900/50 text-green-300" : "bg-gray-800 text-gray-300"}>{season.status}</Badge></div><p className="mt-3 text-sm text-brand-dim">{fmtDate(season.startDate)} – {fmtDate(season.endDate)}</p></div><div className="grid gap-4 sm:grid-cols-3"><div className="bl-stat"><span className="bl-stat-label">Players</span><span className="bl-stat-value text-brand-text">{season._count.playerStats}</span></div><div className="bl-stat"><span className="bl-stat-label">Matches</span><span className="bl-stat-value text-brand-text">{season._count.matches}</span></div><div className="bl-stat"><span className="bl-stat-label">Tournaments</span><span className="bl-stat-value text-brand-text">{season._count.tournaments}</span></div></div><section className="bl-card overflow-x-auto"><h2 className="px-5 pt-5 text-xl font-bold text-brand-text">Season leaderboard</h2>{standings.length === 0 ? <EmptyState message="No season standings yet" /> : <table className="bl-table"><thead><tr><th>#</th><th>Player</th><th>Tier</th><th className="text-right">Rating</th><th className="text-right">W</th><th className="text-right">L</th></tr></thead><tbody>{standings.map((row) => <tr key={row.player.id}><td className="font-mono text-brand-dim">{row.rank}</td><td><Link href={`/players/${row.player.id}`} className="font-medium text-brand-text hover:text-brand-accent">{row.player.displayName}</Link><span className="ml-2 hidden text-xs text-brand-dim sm:inline">@{row.player.username}</span></td><td><TierBadge tier={row.player.tier} size="sm" /></td><td className="text-right font-bold tabular-nums text-brand-text">{row.rating}</td><td className="text-right text-green-400">{row.wins}</td><td className="text-right text-red-400">{row.losses}</td></tr>)}</tbody></table>}</section></div>;
}
