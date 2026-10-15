"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { apiFetch, tierColor } from "@/src/lib/utils";

interface Player { id: string; username: string; displayName: string; tier: string; rating: number; region: string; status?: string; team: { name: string } | null }
interface PlayerResponse { items: Player[]; pagination: { total: number } }
const tiers = ["ACADEMY", "GENIN", "CHUNIN", "JONIN", "KAGE", "BLOODLINE_LEGEND"];

export default function AdminPlayersPage() {
  const { data: session, status: authStatus } = useSession();
  const isAdmin = session?.user.role && ["ADMIN", "OWNER"].includes(session.user.role);
  const [data, setData] = useState<PlayerResponse | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Player | null>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState("");
  const [tier, setTier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(search = query) {
    const result = await apiFetch<PlayerResponse>(`/api/players?page=1&pageSize=100${search.trim() ? `&q=${encodeURIComponent(search.trim())}` : ""}`);
    if ("error" in result) setError(result.error.message);
    else { setData(result.data); setError(""); }
  }
  useEffect(() => { if (authStatus === "authenticated" && isAdmin) load("").catch(() => setError("Could not load players.")); }, [authStatus, isAdmin]);

  async function action(path: string, method: "POST" | "DELETE", body?: unknown) {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    const result = await apiFetch(`/api/admin/players/${encodeURIComponent(selected.id)}/${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
    setBusy(false);
    if ("error" in result) setError(result.error.message);
    else { setNotice("Player record updated."); await load(); }
  }
  async function saveRating(event: FormEvent) { event.preventDefault(); await action("rating", "POST", { rating: Number(rating), reason }); }
  async function saveTier(event: FormEvent) { event.preventDefault(); await action("rank", "POST", { tier, reason }); }
  async function banPlayer(event: FormEvent) { event.preventDefault(); if (window.confirm(`Suspend ${selected?.displayName}?`)) await action("ban", "POST", { reason }); }

  if (authStatus === "loading") return <PageSpinner />;
  if (!isAdmin) return <main className="mx-auto max-w-3xl px-4 py-12"><div className="bl-alert-error">Admin access is required to manage players.</div></main>;
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <div><Link href="/admin" className="text-sm text-brand-dim hover:text-brand-text">← Admin</Link><p className="mt-4 text-xs font-bold uppercase text-emerald-300">Operations</p><h1 className="mt-2 text-3xl font-black text-white">Player management</h1></div>
    {error && <div role="alert" className="bl-alert-error">{error}</div>}{notice && <div role="status" className="bl-alert-success">{notice}</div>}
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); load().catch(() => setError("Search failed.")); }}><input className="bl-input max-w-lg" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players by username or display name" /><button className="bl-btn bl-btn-secondary">Search</button></form>
    {!data ? <PageSpinner /> : data.items.length === 0 ? <div className="bl-card"><EmptyState message="No matching active players" /></div> : <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr]"><section className="divide-y divide-brand-border border-y border-brand-border">{data.items.map((player) => <button key={player.id} type="button" onClick={() => { setSelected(player); setRating(String(player.rating)); setTier(player.tier); setReason(""); }} className={`flex w-full items-center justify-between gap-3 py-3 text-left ${selected?.id === player.id ? "bg-brand-muted/40" : "hover:bg-brand-muted/20"}`}><span><span className="block font-semibold text-brand-text">{player.displayName}</span><span className="text-xs text-brand-dim">@{player.username} · {player.region} · {player.team?.name ?? "Independent"}</span></span><span className="flex items-center gap-2"><TierBadge tier={player.tier} size="sm" /><strong className="tabular-nums" style={{ color: tierColor(player.tier) }}>{player.rating}</strong></span></button>)}</section>
      <section className="space-y-5">{!selected ? <div className="bl-card p-8"><EmptyState message="Select a player" sub="Adjust competitive values or suspend an account." /></div> : <><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-white">{selected.displayName}</h2><p className="text-sm text-brand-dim">@{selected.username} · {selected.region}</p></div><Badge className="bg-brand-muted text-brand-dim">{selected.status ?? "ACTIVE"}</Badge></div><form onSubmit={saveRating} className="border-y border-brand-border py-5"><h3 className="font-bold text-brand-text">Set rating</h3><div className="mt-3 grid gap-3 sm:grid-cols-[130px_1fr_auto]"><input aria-label="New rating" className="bl-input" type="number" min="0" max="9999" required value={rating} onChange={(event) => setRating(event.target.value)} /><input aria-label="Reason for rating change" className="bl-input" minLength={5} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason required for audit" /><button className="bl-btn bl-btn-secondary" disabled={busy}>Save rating</button></div></form><form onSubmit={saveTier} className="border-b border-brand-border pb-5"><h3 className="font-bold text-brand-text">Set rank</h3><div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto]"><select aria-label="New rank" className="bl-select" value={tier} onChange={(event) => setTier(event.target.value)}>{tiers.map((item) => <option key={item}>{item}</option>)}</select><input aria-label="Reason for rank change" className="bl-input" minLength={5} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason required for audit" /><button className="bl-btn bl-btn-secondary" disabled={busy}>Save rank</button></div></form><form onSubmit={banPlayer} className="border-b border-brand-border pb-5"><h3 className="font-bold text-rose-200">Suspend player</h3><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input aria-label="Suspension reason" className="bl-input" minLength={3} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the reason" /><button className="bl-btn bl-btn-danger" disabled={busy}>Suspend account</button></div></form></>}</section></div>}
  </main>;
}
