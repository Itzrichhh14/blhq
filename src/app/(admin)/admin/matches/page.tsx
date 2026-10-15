"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDateTime } from "@/src/lib/utils";

interface Player { id: string; username: string; displayName: string; rating: number }
interface Match { id: string; status: string; format: string; scheduledAt: string | null; map: { name: string; type: string } | null; participants: { score: number | null; player: Player }[] }
interface MatchList { items: Match[]; pagination: { total: number } }
interface PlayerList { items: Player[] }

export default function AdminMatchesPage() {
  const { data: session, status: authStatus } = useSession();
  const isStaff = session?.user.role && ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);
  const isAdmin = session?.user.role && ["ADMIN", "OWNER"].includes(session.user.role);
  const [matches, setMatches] = useState<MatchList | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [scoreWinner, setScoreWinner] = useState("1");
  const [scoreLoser, setScoreLoser] = useState("0");
  const [create, setCreate] = useState({ player1Id: "", player2Id: "", mapType: "ARENA", format: "STANDARD", scheduledAt: "" });

  async function load() {
    const [matchResult, playerResult] = await Promise.all([
      apiFetch<MatchList>("/api/matches?page=1&pageSize=50"),
      apiFetch<PlayerList>("/api/players?page=1&pageSize=100"),
    ]);
    if ("error" in matchResult) setError(matchResult.error.message);
    else setMatches(matchResult.data);
    if ("error" in playerResult) setError(playerResult.error.message);
    else setPlayers(playerResult.data.items);
  }
  useEffect(() => { if (authStatus === "authenticated") load().catch(() => setError("Could not load match data.")); }, [authStatus]);

  async function createMatch(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await apiFetch("/api/matches", { method: "POST", body: JSON.stringify({ ...create, scheduledAt: create.scheduledAt ? new Date(create.scheduledAt).toISOString() : undefined }) });
    setBusy(false);
    if ("error" in result) setError(result.error.message);
    else { setCreate({ player1Id: "", player2Id: "", mapType: "ARENA", format: "STANDARD", scheduledAt: "" }); await load(); }
  }
  async function completeMatch(event: FormEvent) {
    event.preventDefault(); const match = matches?.items.find((item) => item.id === selectedMatch); if (!match) return;
    const loser = match.participants.find((participant) => participant.player.id !== winnerId);
    if (!loser) { setError("This match does not have two participants."); return; }
    setBusy(true); setError("");
    const result = await apiFetch(`/api/matches/${encodeURIComponent(match.id)}/complete`, { method: "POST", body: JSON.stringify({ winnerId, loserId: loser.player.id, scoreWinner: Number(scoreWinner), scoreLoser: Number(scoreLoser) }) });
    setBusy(false);
    if ("error" in result) setError(result.error.message);
    else { setSelectedMatch(""); await load(); }
  }

  if (authStatus === "loading") return <PageSpinner />;
  if (!isStaff) return <main className="mx-auto max-w-3xl px-4 py-12"><div className="bl-alert-error">Staff access is required to manage matches.</div></main>;
  const openMatches = matches?.items.filter((match) => ["SCHEDULED", "LIVE"].includes(match.status)) ?? [];

  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
    <div><Link href="/admin" className="text-sm text-brand-dim hover:text-brand-text">← Admin</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-300">Operations</p><h1 className="mt-2 text-3xl font-black text-white">Match control</h1></div><Badge className="bg-brand-muted text-brand-dim">{openMatches.length} open</Badge></div></div>
    {error && <div role="alert" className="bl-alert-error">{error}</div>}
    {isAdmin && <section className="border-y border-brand-border py-6"><h2 className="text-xl font-bold text-brand-text">Schedule a match</h2><form onSubmit={createMatch} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select aria-label="Player one" required className="bl-select" value={create.player1Id} onChange={(e) => setCreate({ ...create, player1Id: e.target.value })}><option value="">Player one</option>{players.map((player) => <option key={player.id} value={player.id}>{player.displayName} · {player.rating}</option>)}</select><select aria-label="Player two" required className="bl-select" value={create.player2Id} onChange={(e) => setCreate({ ...create, player2Id: e.target.value })}><option value="">Player two</option>{players.map((player) => <option key={player.id} value={player.id}>{player.displayName} · {player.rating}</option>)}</select><select aria-label="Map" className="bl-select" value={create.mapType} onChange={(e) => setCreate({ ...create, mapType: e.target.value })}><option>ARENA</option><option>TRACKING</option><option>TIMED</option></select><select aria-label="Format" className="bl-select" value={create.format} onChange={(e) => setCreate({ ...create, format: e.target.value })}><option>STANDARD</option><option>BO3</option><option>BO5</option></select><button className="bl-btn bl-btn-primary" disabled={busy || !create.player1Id || !create.player2Id || create.player1Id === create.player2Id}>{busy ? "Saving…" : "Schedule match"}</button><label className="bl-form-group sm:col-span-2 lg:col-span-3"><span className="bl-label">Scheduled time (optional)</span><input type="datetime-local" className="bl-input" value={create.scheduledAt} onChange={(e) => setCreate({ ...create, scheduledAt: e.target.value })} /></label></form></section>}
    <section><h2 className="mb-3 text-xl font-bold text-brand-text">Open matches</h2>{!matches ? <PageSpinner /> : openMatches.length === 0 ? <div className="bl-card"><EmptyState message="No scheduled matches" sub="New matches will appear here." /></div> : <div className="divide-y divide-brand-border border-y border-brand-border">{openMatches.map((match) => <article key={match.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><Badge className="bg-amber-900/50 text-amber-200">{match.status}</Badge><span className="text-xs text-brand-dim">{match.format} · {match.map?.name ?? "Map TBD"}</span></div><div className="mt-2 text-lg font-bold text-brand-text">{match.participants.map((item) => item.player.displayName).join(" vs ")}</div><p className="mt-1 text-xs text-brand-dim">{match.scheduledAt ? fmtDateTime(match.scheduledAt) : "Time not set"} · {match.id.slice(-8)}</p></div>{isStaff && match.participants.length === 2 && <div>{selectedMatch === match.id ? <form onSubmit={completeMatch} className="flex flex-wrap items-end gap-2"><label className="bl-form-group"><span className="bl-label">Winner</span><select className="bl-select" value={winnerId} required onChange={(e) => setWinnerId(e.target.value)}>{match.participants.map((item) => <option key={item.player.id} value={item.player.id}>{item.player.displayName}</option>)}</select></label><label className="bl-form-group w-20"><span className="bl-label">Winner score</span><input className="bl-input" type="number" min="0" max="99" required value={scoreWinner} onChange={(e) => setScoreWinner(e.target.value)} /></label><label className="bl-form-group w-20"><span className="bl-label">Other score</span><input className="bl-input" type="number" min="0" max="99" required value={scoreLoser} onChange={(e) => setScoreLoser(e.target.value)} /></label><button className="bl-btn bl-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save result"}</button><button type="button" className="bl-btn bl-btn-ghost" onClick={() => setSelectedMatch("")}>Cancel</button></form> : <button type="button" className="bl-btn bl-btn-secondary" onClick={() => { setSelectedMatch(match.id); setWinnerId(match.participants[0].player.id); }}>Record result</button>}</div>}</article>)}</div>}</section>
  </main>;
}
