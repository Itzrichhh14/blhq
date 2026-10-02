"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDate } from "@/src/lib/utils";

interface Season { id: string; number: number; name: string; status: string; startDate: string | null; endDate: string | null; _count: { matches: number; tournaments: number; playerStats: number } }
export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiFetch<Season[]>("/api/seasons").then((result) => { if ("error" in result) setError(true); else setSeasons(result.data); }).catch(() => setError(true)); }, []);
  return <div className="space-y-6"><div className="bl-page-header"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Competitive history</p><h1 className="bl-page-title text-3xl">Seasons</h1></div>{seasons && <Badge className="bg-brand-accent/10 text-brand-accent">{seasons.length} seasons</Badge>}</div>{error ? <div className="bl-alert-error">Season data could not be loaded.</div> : !seasons ? <PageSpinner /> : seasons.length === 0 ? <div className="bl-card"><EmptyState message="No seasons yet" sub="Season standings will appear here." /></div> : <div className="space-y-3">{seasons.map((season) => <Link key={season.id} href={`/seasons/${season.id}`} className="bl-card flex flex-col gap-4 p-5 transition-colors hover:border-brand-accent/40 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><h2 className="text-xl font-bold text-brand-text">{season.name}</h2><Badge className={season.status === "ACTIVE" ? "bg-green-900/50 text-green-300" : "bg-gray-800 text-gray-300"}>{season.status}</Badge></div><div className="mt-2 text-sm text-brand-dim">{fmtDate(season.startDate)} – {fmtDate(season.endDate)}</div></div><div className="flex gap-5 text-sm text-brand-dim"><span>{season._count.playerStats} players</span><span>{season._count.matches} matches</span><span>{season._count.tournaments} events</span></div></Link>)}</div>}</div>;
}
