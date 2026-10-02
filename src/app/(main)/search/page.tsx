"use client";
import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { apiFetch } from "@/src/lib/utils";

interface Results { query: string; players: { id: string; username: string; displayName: string; tier: string; rating: number }[]; teams: { id: string; name: string; slug: string }[]; tournaments: { id: string; name: string; slug: string; status: string }[]; news: { id: string; title: string; slug: string; category: string }[] }
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [text, setText] = useState(query);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { setText(query); if (query.length < 2) { setResults(null); return; } apiFetch<Results>(`/api/search?q=${encodeURIComponent(query)}`).then((result) => { if ("error" in result) setError(result.error.message); else { setResults(result.data); setError(""); } }).catch(() => setError("Search could not be completed.")); }, [query]);
  function submit(event: FormEvent) { event.preventDefault(); if (text.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(text.trim())}`); }
  const total = results ? results.players.length + results.teams.length + results.tournaments.length + results.news.length : 0;
  return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Discover</p><h1 className="mt-2 text-3xl font-black text-brand-text">Search</h1></div><form onSubmit={submit} className="flex gap-2"><input className="bl-input min-w-0 flex-1" aria-label="Search Bloodline" value={text} onChange={(event) => setText(event.target.value)} placeholder="Players, teams, tournaments, news" minLength={2} /><button className="bl-btn bl-btn-primary" type="submit">Search</button></form>{error && <div className="bl-alert-error">{error}</div>}{query.length < 2 ? <div className="bl-card"><EmptyState message="Search the Bloodline community" sub="Enter at least two characters to see results." /></div> : !results && !error ? <PageSpinner /> : results && total === 0 ? <div className="bl-card"><EmptyState message={`No results for “${results.query}”`} /></div> : results && <div className="space-y-6">{results.players.length > 0 && <section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">Players</h2><div className="mt-3 divide-y divide-brand-border">{results.players.map((player) => <Link key={player.id} href={`/players/${player.id}`} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold text-brand-text">{player.displayName} <span className="text-sm font-normal text-brand-dim">@{player.username}</span></span><span className="flex items-center gap-3"><TierBadge tier={player.tier} size="sm" /><span className="font-bold text-brand-text">{player.rating}</span></span></Link>)}</div></section>}{results.teams.length > 0 && <section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">Teams</h2><div className="mt-3 flex flex-wrap gap-2">{results.teams.map((team) => <Link key={team.id} href={`/teams/${team.id}`}><Badge className="bg-brand-muted text-brand-text">{team.name}</Badge></Link>)}</div></section>}{results.tournaments.length > 0 && <section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">Tournaments</h2><div className="mt-3 space-y-2">{results.tournaments.map((tournament) => <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="flex justify-between text-brand-text hover:text-brand-accent"><span>{tournament.name}</span><span className="text-sm text-brand-dim">{tournament.status}</span></Link>)}</div></section>}{results.news.length > 0 && <section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">News</h2><div className="mt-3 space-y-2">{results.news.map((article) => <Link key={article.id} href={`/news/${article.slug}`} className="flex justify-between text-brand-text hover:text-brand-accent"><span>{article.title}</span><span className="text-sm text-brand-dim">{article.category}</span></Link>)}</div></section>}</div>}</div>;
}
export default function SearchPage() { return <Suspense fallback={<PageSpinner />}><SearchContent /></Suspense>; }
