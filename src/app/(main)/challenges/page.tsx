"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, challengeStatusClass, fmtDateTime } from "@/src/lib/utils";

interface Player { id: string; displayName: string; username: string }
interface Challenge { id: string; status: string; format: string; mapType: string | null; message: string | null; proposedDate: string | null; createdAt: string; challengerId: string; challengedId: string; challenger: Player; challenged: Player; match: { id: string; status: string } | null }
interface ChallengeResponse { items: Challenge[]; pagination: { total: number } }
export default function ChallengesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ChallengeResponse | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  async function load() { const result = await apiFetch<ChallengeResponse>("/api/challenges?page=1&pageSize=50"); if ("error" in result) setError(result.error.message); else { setData(result.data); setError(""); } }
  useEffect(() => { load().catch(() => setError("Could not load challenges.")); }, []);
  async function respond(id: string, response: "ACCEPTED" | "DECLINED") { setBusyId(id); const result = await apiFetch(`/api/challenges/${encodeURIComponent(id)}/respond`, { method: "POST", body: JSON.stringify({ response }) }); setBusyId(""); if ("error" in result) setError(result.error.message); else await load(); }
  return <div className="space-y-6"><div className="bl-page-header"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Competition</p><h1 className="bl-page-title text-3xl">Challenges</h1></div><Link href="/challenges/new" className="bl-btn bl-btn-primary bl-btn-sm">New challenge</Link></div>{error && <div className="bl-alert-error">{error}</div>}{!data ? <PageSpinner /> : data.items.length === 0 ? <div className="bl-card"><EmptyState message="No challenges yet" sub="Challenge a player to start a competitive match." /></div> : <div className="space-y-3">{data.items.map((challenge) => { const incoming = challenge.challengedId === session?.user.playerId; const opponent = incoming ? challenge.challenger : challenge.challenged; return <article key={challenge.id} className="bl-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Badge className={challengeStatusClass(challenge.status)}>{challenge.status}</Badge><span className="text-xs text-brand-dim">{incoming ? "Incoming" : "Outgoing"}</span></div><h2 className="mt-2 text-lg font-bold text-brand-text">{incoming ? "Challenge from" : "Challenge to"} {opponent.displayName}</h2><p className="mt-1 text-sm text-brand-dim">{challenge.format}{challenge.mapType ? ` · ${challenge.mapType}` : ""}{challenge.proposedDate ? ` · ${fmtDateTime(challenge.proposedDate)}` : ""}</p>{challenge.message && <p className="mt-2 text-sm text-brand-dim">{challenge.message}</p>}{challenge.match && <Link href={`/matches/${challenge.match.id}`} className="mt-2 inline-block text-sm text-brand-accent hover:underline">Open scheduled match</Link>}</div>{incoming && challenge.status === "PENDING" && <div className="flex gap-2"><button type="button" className="bl-btn bl-btn-primary bl-btn-sm" disabled={busyId === challenge.id} onClick={() => respond(challenge.id, "ACCEPTED")}>Accept</button><button type="button" className="bl-btn bl-btn-secondary bl-btn-sm" disabled={busyId === challenge.id} onClick={() => respond(challenge.id, "DECLINED")}>Decline</button></div>}</div></article>; })}</div>}</div>;
}
