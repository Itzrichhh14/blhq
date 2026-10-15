"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, challengeStatusClass, fmtDateTime } from "@/src/lib/utils";

interface ChallengePlayer { id: string; username: string; displayName: string; avatar: string | null; tier: string; rating: number }
interface ChallengeDetail {
  id: string; challengerId: string; challengedId: string; status: string; format: string;
  mapType: string | null; message: string | null; proposedDate: string | null; expiresAt: string | null;
  challenger: ChallengePlayer; challenged: ChallengePlayer;
  match: { id: string; status: string; completedAt: string | null } | null;
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const result = await apiFetch<ChallengeDetail>(`/api/challenges/${encodeURIComponent(id)}`);
    if ("error" in result) setError(result.error.message);
    else { setChallenge(result.data); setError(""); }
  }
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/challenges/${id}`)}`);
      return;
    }
    if (authStatus === "authenticated") load().catch(() => setError("Could not load this challenge."));
  }, [authStatus, id, router]);

  async function act(action: "ACCEPTED" | "DECLINED" | "CANCEL") {
    setBusy(true);
    setError("");
    const result = action === "CANCEL"
      ? await apiFetch(`/api/challenges/${encodeURIComponent(id)}`, { method: "DELETE" })
      : await apiFetch(`/api/challenges/${encodeURIComponent(id)}/respond`, { method: "POST", body: JSON.stringify({ response: action }) });
    setBusy(false);
    if ("error" in result) setError(result.error.message);
    else await load();
  }

  if (authStatus === "loading" || (!challenge && !error)) return <PageSpinner />;
  if (!challenge) return <main className="mx-auto max-w-3xl px-4 py-12"><div role="alert" className="bl-alert-error">{error || "Challenge not found."}</div><Link href="/challenges" className="mt-4 inline-block text-sm text-brand-accent">Back to challenges</Link></main>;

  const isChallenger = challenge.challengerId === session?.user.playerId;
  const opponent = isChallenger ? challenge.challenged : challenge.challenger;
  const canRespond = !isChallenger && challenge.status === "PENDING";
  const canCancel = isChallenger && challenge.status === "PENDING";

  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
    <Link href="/challenges" className="text-sm text-brand-dim hover:text-brand-text">← Challenges</Link>
    <section className="bl-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">1v1 challenge</p><h1 className="mt-2 text-3xl font-black text-brand-text">{isChallenger ? "You challenged" : "Challenge from"} {opponent.displayName}</h1><p className="mt-2 text-sm text-brand-dim">@{opponent.username} · {opponent.tier} · Rating {opponent.rating}</p></div><Badge className={challengeStatusClass(challenge.status)}>{challenge.status}</Badge></div>
      <div className="grid gap-4 p-6 sm:grid-cols-3"><div><div className="text-xs uppercase tracking-[0.15em] text-brand-dim">Format</div><div className="mt-1 font-semibold text-brand-text">{challenge.format}</div></div><div><div className="text-xs uppercase tracking-[0.15em] text-brand-dim">Map</div><div className="mt-1 font-semibold text-brand-text">{challenge.mapType ?? "To be agreed"}</div></div><div><div className="text-xs uppercase tracking-[0.15em] text-brand-dim">Proposed time</div><div className="mt-1 font-semibold text-brand-text">{challenge.proposedDate ? fmtDateTime(challenge.proposedDate) : "To be agreed"}</div></div></div>
      {challenge.message && <div className="border-t border-brand-border px-6 py-4 text-brand-dim">{challenge.message}</div>}
      {challenge.expiresAt && challenge.status === "PENDING" && <div className="border-t border-brand-border px-6 py-3 text-xs text-brand-dim">Expires {fmtDateTime(challenge.expiresAt)}</div>}
      {challenge.match && <div className="border-t border-brand-border px-6 py-4"><Link href={`/matches/${challenge.match.id}`} className="text-sm font-semibold text-emerald-300 hover:underline">Open scheduled match →</Link></div>}
    </section>
    {error && <div role="alert" className="bl-alert-error">{error}</div>}
    {(canRespond || canCancel) && <div className="flex flex-wrap gap-3">{canRespond && <><button type="button" className="bl-btn bl-btn-primary" disabled={busy} onClick={() => act("ACCEPTED")}>{busy ? "Saving…" : "Accept challenge"}</button><button type="button" className="bl-btn bl-btn-secondary" disabled={busy} onClick={() => act("DECLINED")}>Decline</button></>}{canCancel && <button type="button" className="bl-btn bl-btn-danger" disabled={busy} onClick={() => act("CANCEL")}>Cancel challenge</button>}</div>}
  </main>;
}
