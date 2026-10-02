"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch } from "@/src/lib/utils";

interface Player { id: string; username: string; displayName: string; rating: number; tier: string }
interface PlayerResponse { items: Player[] }
export default function NewChallengePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [challengedId, setChallengedId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiFetch<PlayerResponse>("/api/players?page=1&pageSize=100").then((result) => { if ("error" in result) setError(result.error.message); else setPlayers(result.data.items); }).catch(() => setError("Could not load players.")); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const result = await apiFetch("/api/challenges", { method: "POST", body: JSON.stringify({ challengedId, message: message.trim() || undefined }) });
    setBusy(false);
    if ("error" in result) setError(result.error.message);
    else router.push("/challenges");
  }
  return <div className="mx-auto max-w-2xl space-y-6"><div><Link href="/challenges" className="text-sm text-brand-dim hover:text-brand-text">← Challenges</Link><h1 className="mt-3 text-3xl font-black text-brand-text">New challenge</h1></div><form onSubmit={submit} className="bl-card space-y-5 p-6">{error && <div className="bl-alert-error">{error}</div>}{!players ? <PageSpinner /> : players.length === 0 ? <EmptyState message="No players available" /> : <><div className="bl-form-group"><label htmlFor="opponent" className="bl-label">Opponent</label><select id="opponent" className="bl-select" value={challengedId} onChange={(event) => setChallengedId(event.target.value)} required><option value="">Choose a player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.displayName} · {player.tier} · {player.rating}</option>)}</select></div><div className="bl-form-group"><label htmlFor="message" className="bl-label">Message <span className="text-brand-dim">(optional)</span></label><textarea id="message" className="bl-input min-h-28" maxLength={300} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Suggest a time or map…" /></div><div className="flex justify-end gap-3"><Link href="/challenges" className="bl-btn bl-btn-secondary">Cancel</Link><button type="submit" className="bl-btn bl-btn-primary" disabled={busy || !challengedId}>{busy ? "Sending…" : "Send challenge"}</button></div></>}</form></div>;
}
