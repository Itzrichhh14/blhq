"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDate } from "@/src/lib/utils";

interface TournamentDetail {
  id: string; name: string; status: string; format: string; maxPlayers: number; prizeInfo: string | null;
  description: string | null; mapType: string | null; startDate: string | null;
  participants: { id: string; seed: number | null; status: string; player: { id: string; username: string; displayName: string; tier: string; rating: number } }[];
  season: { name: string } | null;
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status: authStatus } = useSession();
  const [event, setEvent] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    apiFetch<TournamentDetail>(`/api/tournaments/${encodeURIComponent(id)}`).then((result) => {
      if ("error" in result) setError(result.error.message);
      else setEvent(result.data);
    }).catch(() => setError("Tournament data could not be loaded."));
  }, [id]);

  async function register() {
    setRegistering(true);
    setRegistrationMessage("");
    const result = await apiFetch(`/api/tournaments/${encodeURIComponent(id)}/participants`, { method: "POST", body: "{}" });
    setRegistering(false);
    if ("error" in result) setRegistrationMessage(result.error.message);
    else {
      setRegistrationMessage("Registration confirmed.");
      const refreshed = await apiFetch<TournamentDetail>(`/api/tournaments/${encodeURIComponent(id)}`);
      if (!("error" in refreshed)) setEvent(refreshed.data);
    }
  }

  if (error && !event) return <div className="bl-card p-8 text-center"><h1 className="text-2xl font-black text-brand-text">Tournament unavailable</h1><p className="mt-2 text-brand-dim">{error}</p><Link href="/tournaments" className="mt-4 inline-block text-brand-accent">Back to tournaments</Link></div>;
  if (!event) return <PageSpinner />;

  return <div className="space-y-6">
    <div className="bl-card p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Tournament</p><h1 className="mt-2 text-3xl font-black text-brand-text">{event.name}</h1></div><div className="flex flex-col items-start gap-3 md:items-end"><Badge className={event.status === "LIVE" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-blue-300"}>{event.status.replaceAll("_", " ")}</Badge>{event.status === "REGISTRATION" && authStatus === "authenticated" && <button type="button" onClick={register} disabled={registering} className="bl-btn bl-btn-primary">{registering ? "Registering…" : "Register for event"}</button>}</div></div></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[{ label: "Format", value: event.format.replaceAll("_", " ") }, { label: "Prize", value: event.prizeInfo || "To be announced" }, { label: "Season", value: event.season?.name || "Unassigned" }, { label: "Players", value: `${event.participants.length}/${event.maxPlayers}` }].map((item) => <div key={item.label} className="bl-stat"><span className="bl-stat-label">{item.label}</span><span className="bl-stat-value text-brand-text">{item.value}</span></div>)}</div>
    {(registrationMessage || error) && <div className={registrationMessage === "Registration confirmed." ? "bl-alert-success" : "bl-alert-error"}>{registrationMessage || error}</div>}
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><section className="bl-card p-6"><h2 className="text-xl font-bold text-brand-text">Overview</h2><p className="mt-4 text-brand-dim">{event.description || "More details will be announced by the organizers."}</p><div className="mt-4 text-sm text-brand-dim">{event.mapType ? `Map: ${event.mapType}` : "Map to be announced"}{event.startDate ? ` · Starts ${fmtDate(event.startDate)}` : ""}</div></section><section className="bl-card p-6"><h2 className="text-xl font-bold text-brand-text">Participants</h2>{event.participants.length === 0 ? <EmptyState message="No registered players yet" /> : <div className="mt-4 divide-y divide-brand-border">{event.participants.map((participant) => <Link key={participant.id} href={`/players/${participant.player.id}`} className="flex items-center justify-between gap-3 py-3"><div><div className="font-semibold text-brand-text">{participant.player.displayName}</div><div className="text-sm text-brand-dim">@{participant.player.username} · {participant.player.tier}</div></div><div className="text-sm font-bold text-brand-accent">{participant.seed ? `Seed ${participant.seed}` : participant.status}</div></Link>)}</div>}</section></div>
  </div>;
}
