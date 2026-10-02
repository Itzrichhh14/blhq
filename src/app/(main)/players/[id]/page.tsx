"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/src/components/ui/Badge";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtWinRate, tierColor } from "@/src/lib/utils";

interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  region: string;
  tier: string;
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  totalMatches: number;
  currentStreak: number;
  longestStreak: number;
  tournamentWins: number;
  mvpCount: number;
  mainMap: string | null;
  specialty: string | null;
  team: { name: string } | null;
  matchHistory?: { items: PlayerMatch[] };
}
interface PlayerMatch {
  id: string;
  result: string;
  mapName: string | null;
  myScore: number | null;
  opponentScore: number | null;
  ratingDelta: number | null;
  completedAt: string | null;
  opponent: { displayName: string } | null;
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<PlayerProfile>(`/api/players/${encodeURIComponent(id)}?include=matchHistory`).then((result) => {
      if ("error" in result) setError(true);
      else setPlayer(result.data);
    }).catch(() => setError(true));
  }, [id]);

  if (error) return <div className="bl-card p-8 text-center"><h1 className="text-2xl font-black text-brand-text">Player not found</h1><Link href="/players" className="mt-4 inline-block text-brand-accent">Back to players</Link></div>;
  if (!player) return <PageSpinner />;

  const color = tierColor(player.tier);
  const stats = [
    { label: "Wins", value: player.wins, accent: "text-green-400" },
    { label: "Losses", value: player.losses, accent: "text-red-400" },
    { label: "Win rate", value: fmtWinRate(player.wins, player.totalMatches), accent: "text-brand-text" },
    { label: "Current streak", value: player.currentStreak > 0 ? `+${player.currentStreak}` : String(player.currentStreak), accent: player.currentStreak > 0 ? "text-green-400" : "text-brand-dim" },
  ];
  const history = player.matchHistory?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="bl-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-brand-muted text-2xl font-black" style={{ color, borderColor: `${color}55` }}>{player.avatar || player.displayName[0]}</div>
            <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black text-brand-text">{player.displayName}</h1><TierBadge tier={player.tier} /></div><p className="text-brand-dim">@{player.username} · {player.team?.name ?? "Independent"} · {player.region}</p></div>
          </div>
          <div className="text-right"><div className="text-4xl font-black tabular-nums" style={{ color }}>{player.rating}</div><div className="text-sm text-brand-dim">Peak {player.peakRating}</div></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="bl-stat"><span className="bl-stat-label">{stat.label}</span><span className={`bl-stat-value ${stat.accent}`}>{stat.value}</span></div>)}</div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="bl-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-brand-text">Recent matches</h2></div>
          {history.length === 0 ? <EmptyState message="No completed matches" /> : <div className="space-y-3">{history.map((match) => <Link href={`/matches/${match.id}`} key={match.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-surface p-3"><div><div className="text-sm text-brand-dim">{match.mapName ?? "Match"}</div><div className="font-semibold text-brand-text">vs {match.opponent?.displayName ?? "Opponent"}</div></div><div className="text-right"><div className={`font-bold ${match.result === "WIN" ? "text-green-400" : "text-red-400"}`}>{match.result}</div><div className="text-xs text-brand-dim">{match.myScore ?? "–"}-{match.opponentScore ?? "–"}{match.ratingDelta !== null ? ` · ${match.ratingDelta > 0 ? "+" : ""}${match.ratingDelta} rating` : ""}</div></div></Link>)}</div>}
        </section>
        <section className="bl-card p-5"><h2 className="text-xl font-bold text-brand-text">Profile</h2><div className="mt-4 space-y-4 text-sm text-brand-dim"><div><div className="text-xs uppercase tracking-[0.2em]">Specialty</div><div className="mt-1 text-brand-text">{player.specialty ?? "Not set"}</div></div><div><div className="text-xs uppercase tracking-[0.2em]">Main map</div><div className="mt-1 text-brand-text">{player.mainMap ?? "Not set"}</div></div><div><div className="text-xs uppercase tracking-[0.2em]">Bio</div><div className="mt-1 text-brand-text">{player.bio ?? "No bio yet."}</div></div><div><div className="text-xs uppercase tracking-[0.2em]">Career</div><div className="mt-1 text-brand-text">{player.tournamentWins} tournament wins · {player.mvpCount} MVPs · longest streak {player.longestStreak}</div></div></div></section>
      </div>
    </div>
  );
}
