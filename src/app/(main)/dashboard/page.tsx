"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, fmtRelative, fmtDate, fmtDelta, tierColor, tierName,
         movementIcon, movementClass, rarityClass, challengeStatusClass,
         tournamentStatusClass } from "@/src/lib/utils";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import type { DashboardData } from "@/src/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    apiFetch<DashboardData>("/api/me/dashboard").then(res => {
      setLoading(false);
      if ("error" in res) setError(res.error.message);
      else setData(res.data);
    });
  }, [status, router]);

  if (status === "loading" || loading) return <PageSpinner />;
  if (error) return <div className="bl-alert-error max-w-xl mx-auto mt-12">{error}</div>;
  if (!data) return null;

  const { profile, rankProgress, recentMatches, achievements,
          activeChallenges, unreadNotifications, activeTournaments,
          currentSeasonStats, rankMovement, currentRank } = data;

  const tierCol = tierColor(profile.tier);
  const progressPct = rankProgress.progressPercent;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="bl-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
               style={{ background: `${tierCol}22`, border: `2px solid ${tierCol}66`, color: tierCol }}>
            {profile.displayName[0].toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-brand-text">{profile.displayName}</h1>
              <TierBadge tier={profile.tier} size="md" />
              {currentRank && (
                <span className={`text-sm font-semibold ${movementClass(rankMovement)}`}>
                  {movementIcon(rankMovement)} #{currentRank}
                </span>
              )}
              {unreadNotifications > 0 && (
                <Link href="/notifications">
                  <Badge className="bg-brand-accent text-white">
                    {unreadNotifications} new
                  </Badge>
                </Link>
              )}
            </div>
            <p className="text-brand-dim text-sm mt-0.5">
              {profile.username} · {profile.region} {profile.teamName && `· ${profile.teamName}`}
            </p>
            {profile.bio && <p className="text-brand-dim/70 text-sm mt-1 truncate max-w-lg">{profile.bio}</p>}
          </div>

          {/* Rating */}
          <div className="text-right flex-shrink-0">
            <div className="text-4xl font-black tabular-nums" style={{ color: tierCol }}>
              {profile.rating}
            </div>
            <div className="text-brand-dim text-xs mt-0.5">Peak {profile.peakRating}</div>
          </div>
        </div>

        {/* Rank progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-brand-dim mb-1.5">
            <span>{tierName(profile.tier)}</span>
            {rankProgress.nextTier
              ? <span>{rankProgress.requiredRating ? `${rankProgress.requiredRating - profile.rating} to ${rankProgress.nextTierName}` : ""}</span>
              : <span className="text-amber-400">Max Rank</span>}
          </div>
          <div className="bl-progress-track">
            <div className="bl-progress-fill" style={{ width: `${progressPct}%`, backgroundColor: tierCol }} />
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Wins",       value: profile.wins },
          { label: "Losses",     value: profile.losses },
          { label: "Win Rate",   value: `${profile.winRate}%` },
          { label: "Matches",    value: profile.totalMatches },
          { label: "Streak",     value: profile.currentStreak > 0 ? `+${profile.currentStreak}` : profile.currentStreak, color: profile.currentStreak > 0 ? "#22C55E" : profile.currentStreak < 0 ? "#EF4444" : undefined },
          { label: "MVPs",       value: profile.mvpCount },
        ].map(s => (
          <div key={s.label} className="bl-stat">
            <span className="bl-stat-label">{s.label}</span>
            <span className="bl-stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Matches */}
        <div className="bl-card">
          <div className="bl-card-header">
            Recent Matches
            <Link href="/matches" className="text-xs text-brand-dim hover:text-brand-text">View all →</Link>
          </div>
          <div className="bl-card-body p-0">
            {recentMatches.length === 0
              ? <EmptyState message="No matches yet" />
              : recentMatches.map(m => (
                <Link key={m.id} href={`/matches/${m.id}`}
                  className="flex items-center justify-between px-5 py-3.5 border-b border-brand-border/50 last:border-0 hover:bg-brand-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 text-center text-xs font-bold rounded px-1.5 py-0.5 ${m.result === "WIN" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
                      {m.result}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-brand-text">{m.opponentDisplayName}</p>
                      <p className="text-xs text-brand-dim">{m.mapType ?? "—"} · {m.format}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {m.ratingDelta !== null && (
                      <p className={`text-sm font-bold tabular-nums ${m.ratingDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmtDelta(m.ratingDelta)}
                      </p>
                    )}
                    <p className="text-xs text-brand-dim">{fmtRelative(m.completedAt)}</p>
                  </div>
                </Link>
              ))
            }
          </div>
        </div>

        {/* Active Challenges */}
        <div className="bl-card">
          <div className="bl-card-header">
            Challenges
            <div className="flex gap-2">
              <Link href="/challenges/new" className="bl-btn bl-btn-primary bl-btn-sm text-xs">New</Link>
              <Link href="/challenges" className="text-xs text-brand-dim hover:text-brand-text">View all →</Link>
            </div>
          </div>
          <div className="bl-card-body p-0">
            {activeChallenges.length === 0
              ? <EmptyState message="No active challenges" />
              : activeChallenges.map(c => (
                <Link key={c.id} href={`/challenges/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5 border-b border-brand-border/50 last:border-0 hover:bg-brand-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-brand-text">{c.opponentDisplayName}</p>
                    <p className="text-xs text-brand-dim">
                      {c.isChallenger ? "You challenged" : "Challenged you"}{c.mapType ? ` · ${c.mapType}` : ""}
                    </p>
                  </div>
                  <Badge className={challengeStatusClass(c.status)}>{c.status}</Badge>
                </Link>
              ))
            }
          </div>
        </div>

        {/* Achievements */}
        <div className="bl-card">
          <div className="bl-card-header">
            Achievements
            <Link href="/achievements" className="text-xs text-brand-dim hover:text-brand-text">
              {achievements.totalUnlocked}/{achievements.totalAvailable} →
            </Link>
          </div>
          <div className="bl-card-body">
            {achievements.unlocked.length === 0
              ? <EmptyState message="No achievements yet" sub="Complete matches to earn your first achievement" />
              : <div className="flex flex-wrap gap-2">
                  {achievements.unlocked.map(a => (
                    <div key={a.key} title={`${a.name} — unlocked ${fmtDate(a.unlockedAt)}`}
                      className={`bl-badge ${rarityClass(a.rarity)} cursor-default`}>
                      {a.name}
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        {/* Season stats + Tournaments */}
        <div className="flex flex-col gap-6">
          {currentSeasonStats && (
            <div className="bl-card">
              <div className="bl-card-header">{currentSeasonStats.seasonName}</div>
              <div className="bl-card-body grid grid-cols-3 gap-3">
                {[
                  { label: "Rating",   value: currentSeasonStats.rating },
                  { label: "Wins",     value: currentSeasonStats.wins },
                  { label: "Losses",   value: currentSeasonStats.losses },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-bold text-brand-text">{s.value}</p>
                    <p className="text-xs text-brand-dim mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bl-card">
            <div className="bl-card-header">
              Active Tournaments
              <Link href="/tournaments" className="text-xs text-brand-dim hover:text-brand-text">Browse →</Link>
            </div>
            <div className="bl-card-body p-0">
              {activeTournaments.length === 0
                ? <EmptyState message="Not registered in any tournament" />
                : activeTournaments.map(t => (
                  <Link key={t.id} href={`/tournaments/${t.id}`}
                    className="flex items-center justify-between px-5 py-3 border-b border-brand-border/50 last:border-0 hover:bg-brand-muted/30 transition-colors">
                    <p className="text-sm font-medium text-brand-text">{t.name}</p>
                    <Badge className={tournamentStatusClass(t.status)}>{t.status}</Badge>
                  </Link>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
