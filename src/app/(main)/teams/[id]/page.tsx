"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { apiFetch, fmtWinRate } from "@/src/lib/utils";

interface TeamDetail { id: string; name: string; slug: string; description: string | null; color: string | null; avgRating: number; totalWins: number; totalMatches: number; players: { id: string; username: string; displayName: string; avatar: string | null; tier: string; rating: number; wins: number; losses: number; totalMatches: number; region: string }[]; achievements: { id: string; title: string; description: string | null; awardedAt: string }[] }
export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiFetch<TeamDetail>(`/api/teams/${encodeURIComponent(id)}`).then((result) => { if ("error" in result) setError(true); else setTeam(result.data); }).catch(() => setError(true)); }, [id]);
  if (error) return <div className="bl-card p-8 text-center"><h1 className="text-2xl font-black text-brand-text">Team not found</h1><Link href="/teams" className="mt-4 inline-block text-brand-accent">Back to teams</Link></div>;
  if (!team) return <PageSpinner />;
  return <div className="space-y-6"><div className="bl-card p-6"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-2xl font-black" style={{ color: team.color || undefined }}>{team.name.slice(0, 2).toUpperCase()}</div><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Organization</p><h1 className="mt-1 text-3xl font-black text-brand-text">{team.name}</h1></div></div>{team.description && <p className="mt-5 text-brand-dim">{team.description}</p>}</div><div className="grid gap-4 sm:grid-cols-3"><div className="bl-stat"><span className="bl-stat-label">Roster</span><span className="bl-stat-value text-brand-text">{team.players.length}</span></div><div className="bl-stat"><span className="bl-stat-label">Average rating</span><span className="bl-stat-value text-brand-text">{team.avgRating}</span></div><div className="bl-stat"><span className="bl-stat-label">Career wins</span><span className="bl-stat-value text-green-400">{team.totalWins}</span></div></div><section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">Active roster</h2>{team.players.length === 0 ? <EmptyState message="No active players on this roster" /> : <div className="mt-4 divide-y divide-brand-border">{team.players.map((player) => <Link key={player.id} href={`/players/${player.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="font-semibold text-brand-text">{player.displayName}</div><div className="text-sm text-brand-dim">@{player.username} · {player.region}</div></div><div className="flex items-center gap-3"><TierBadge tier={player.tier} size="sm" /><span className="font-bold tabular-nums text-brand-text">{player.rating}</span><span className="text-sm text-brand-dim">{fmtWinRate(player.wins, player.totalMatches)} win rate</span></div></Link>)}</div>}</section>{team.achievements.length > 0 && <section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">Team honors</h2><div className="mt-4 flex flex-wrap gap-2">{team.achievements.map((item) => <Badge key={item.id} className="bg-brand-muted text-brand-text">{item.title}</Badge>)}</div></section>}</div>;
}
