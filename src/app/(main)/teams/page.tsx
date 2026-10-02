"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch } from "@/src/lib/utils";

interface Team { id: string; name: string; slug: string; description: string | null; color: string | null; memberCount: number; avgRating: number; totalWins: number; totalLosses: number; totalTournamentWins: number }
export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiFetch<Team[]>("/api/teams").then((result) => { if ("error" in result) setError(true); else setTeams(result.data); }).catch(() => setError(true)); }, []);
  return <div className="space-y-6"><div className="bl-page-header"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Organizations</p><h1 className="bl-page-title text-3xl">Teams</h1></div>{teams && <Badge className="bg-brand-accent/10 text-brand-accent">{teams.length} teams</Badge>}</div>{error ? <div className="bl-alert-error">Team data could not be loaded.</div> : !teams ? <PageSpinner /> : teams.length === 0 ? <div className="bl-card"><EmptyState message="No teams yet" sub="Competitive organizations will appear here." /></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <Link key={team.id} href={`/teams/${team.id}`} className="bl-card block p-5 transition-transform hover:-translate-y-0.5 hover:border-brand-accent/40"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-lg font-black" style={{ color: team.color || undefined }}>{team.name.slice(0, 2).toUpperCase()}</div><div><h2 className="text-xl font-bold text-brand-text">{team.name}</h2><p className="text-sm text-brand-dim">{team.memberCount} active members</p></div></div><p className="mt-4 min-h-12 text-sm text-brand-dim">{team.description || "Competitive team"}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg border border-brand-border bg-brand-surface p-2"><div className="text-xs text-brand-dim">Rating</div><div className="mt-1 font-bold text-brand-text">{team.avgRating}</div></div><div className="rounded-lg border border-brand-border bg-brand-surface p-2"><div className="text-xs text-brand-dim">Wins</div><div className="mt-1 font-bold text-green-400">{team.totalWins}</div></div><div className="rounded-lg border border-brand-border bg-brand-surface p-2"><div className="text-xs text-brand-dim">Titles</div><div className="mt-1 font-bold text-brand-accent">{team.totalTournamentWins}</div></div></div></Link>)}</div>}</div>;
}
