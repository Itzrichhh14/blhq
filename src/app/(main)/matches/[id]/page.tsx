"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDateTime } from "@/src/lib/utils";

interface MatchDetail {
  id: string;
  format: string;
  status: string;
  completedAt: string | null;
  scheduledAt: string | null;
  notes: string | null;
  scoreWinner: number | null;
  scoreLoser: number | null;
  map: { name: string; type: string } | null;
  participants: { isWinner: boolean; score: number | null; ratingDelta: number | null; player: { id: string; username: string; displayName: string; avatar: string | null; tier: string; rating: number } }[];
  season: { name: string } | null;
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiFetch<MatchDetail>(`/api/matches/${encodeURIComponent(id)}`).then((result) => {
      if ("error" in result) setError(true);
      else setMatch(result.data);
    }).catch(() => setError(true));
  }, [id]);

  if (error) return <div className="bl-card p-8 text-center">
    <h1 className="text-2xl font-black text-brand-text">Match not found</h1>
    <Link href="/matches" className="mt-4 inline-block text-brand-accent">Back to matches</Link>
  </div>;
  if (!match) return <PageSpinner />;

  return <div className="space-y-6">
    <div className="bl-card p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Match details · {match.status}</p>
          <h1 className="mt-2 text-3xl font-black text-brand-text">{match.map?.name ?? "Match"}</h1>
        </div>
        <div className="text-right text-sm text-brand-dim">
          <div>{match.format}{match.map ? ` · ${match.map.type}` : ""}</div>
          <div>{fmtDateTime(match.completedAt ?? match.scheduledAt)}</div>
          {match.season && <div>{match.season.name}</div>}
        </div>
      </div>
    </div>
    {match.participants.length === 0 ? <div className="bl-card"><EmptyState message="No participants recorded" /></div> : <div className="grid gap-6 lg:grid-cols-2">{match.participants.map((entry) => <div key={entry.player.id} className="bl-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-brand-dim">{entry.isWinner ? "Winner" : "Participant"}</div>
          <Link href={`/players/${entry.player.id}`} className="text-2xl font-black text-brand-text hover:text-brand-accent">{entry.player.displayName}</Link>
          <div className="text-sm text-brand-dim">@{entry.player.username} · {entry.player.tier}</div>
        </div>
        <div className="text-3xl font-black text-brand-text">{entry.score ?? "–"}</div>
      </div>
      <div className="mt-4 rounded-lg border border-brand-border bg-brand-surface p-3 text-sm text-brand-dim">Rating {entry.ratingDelta === null ? "unchanged" : `${entry.ratingDelta > 0 ? "+" : ""}${entry.ratingDelta}`} · Current {entry.player.rating}</div>
    </div>)}</div>}
    {match.notes && <div className="bl-card p-6">
      <h2 className="text-xl font-bold text-brand-text">Match notes</h2>
      <p className="mt-4 text-brand-dim">{match.notes}</p>
    </div>}
  </div>;
}
