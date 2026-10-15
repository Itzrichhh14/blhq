"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { TierBadge } from "@/src/components/ui/TierBadge";
import { apiFetch, fmtDate, tournamentStatusClass } from "@/src/lib/utils";

// ── Types ─────────────────────────────────────────────────────
interface TPlayer { id: string; username: string; displayName: string; tier: string; rating: number }
interface Participant {
  id: string;
  seed: number | null;
  status: string;
  player: TPlayer;
}
interface TMatch {
  id: string;
  round: number;
  position: number;
  bracketSide: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  status: string;
}
interface TournamentDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  maxPlayers: number;
  prizeInfo: string | null;
  description: string | null;
  mapType: string | null;
  startDate: string | null;
  endDate: string | null;
  participants: Participant[];
  matches: TMatch[];
  season: { name: string } | null;
  _count: { participants: number };
}

// ── Bracket component ─────────────────────────────────────────
function BracketView({
  matches,
  playerMap,
}: {
  matches: TMatch[];
  playerMap: Map<string, TPlayer>;
}) {
  if (matches.length === 0) return null;

  // Group by side → round
  const sides: string[] = [];
  for (const m of matches) {
    if (!sides.includes(m.bracketSide)) sides.push(m.bracketSide);
  }
  // Order: winners first, then losers, then grand_finals
  const sideOrder: Record<string, number> = { winners: 0, round_robin: 0, losers: 1, grand_finals: 2 };
  sides.sort((a, b) => (sideOrder[a] ?? 5) - (sideOrder[b] ?? 5));

  return (
    <div className="space-y-6 overflow-x-auto">
      {sides.map(side => {
        const sideMatches = matches.filter(m => m.bracketSide === side);
        const rounds = [...new Set(sideMatches.map(m => m.round))].sort((a, b) => a - b);
        const sideLabel =
          side === "grand_finals" ? "Grand Finals" :
          side === "losers" ? "Losers Bracket" :
          side === "round_robin" ? "Round Robin" :
          "Winners Bracket";

        return (
          <div key={side}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">
              {sideLabel}
            </div>
            {/* Horizontal scroll bracket */}
            <div className="flex min-w-max gap-6">
              {rounds.map(round => {
                const roundMatches = sideMatches
                  .filter(m => m.round === round)
                  .sort((a, b) => a.position - b.position);
                return (
                  <div key={round} className="flex flex-col gap-3">
                    <div className="mb-1 text-center text-xs text-brand-dim/60">
                      {side === "round_robin" ? `Round ${round}` : `R${round}`}
                    </div>
                    {roundMatches.map(m => {
                      const p1 = m.player1Id ? playerMap.get(m.player1Id) : null;
                      const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                      const done = m.status === "COMPLETED";
                      return (
                        <div
                          key={m.id}
                          className={`w-52 rounded-lg border ${done ? "border-brand-border/50 opacity-75" : "border-brand-border"} bg-brand-surface overflow-hidden`}
                        >
                          {[
                            { player: p1, pid: m.player1Id },
                            { player: p2, pid: m.player2Id },
                          ].map(({ player, pid }, idx) => {
                            const isWinner = done && m.winnerId === pid;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm
                                  ${idx === 0 ? "border-b border-brand-border/50" : ""}
                                  ${isWinner ? "bg-emerald-900/20" : ""}
                                `}
                              >
                                <span
                                  className={`truncate font-medium ${
                                    !player ? "text-brand-dim/40 italic" :
                                    isWinner ? "text-emerald-300" : "text-brand-text"
                                  }`}
                                >
                                  {player?.displayName ?? "TBD"}
                                </span>
                                {isWinner && (
                                  <span className="shrink-0 text-xs text-emerald-400">✓</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Staff result form ─────────────────────────────────────────
function RecordResultForm({
  match,
  tournamentId,
  playerMap,
  onDone,
  onCancel,
}: {
  match: TMatch;
  tournamentId: string;
  playerMap: Map<string, TPlayer>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const p1 = match.player1Id ? playerMap.get(match.player1Id) : null;
  const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;
  const [winnerId, setWinnerId] = useState(match.player1Id ?? "");
  const [sw, setSw] = useState("1");
  const [sl, setSl] = useState("0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    if (!loserId) { setErr("Cannot identify both players."); return; }
    setBusy(true); setErr("");
    const r = await apiFetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/result`, {
      method: "POST",
      body: JSON.stringify({
        tournamentMatchId: match.id,
        winnerId,
        loserId,
        scoreWinner: Number(sw),
        scoreLoser: Number(sl),
      }),
    });
    setBusy(false);
    if ("error" in r) setErr(r.error.message);
    else onDone();
  }

  return (
    <form
      onSubmit={submit}
      className="bl-card border-emerald-300/20 bg-emerald-950/10 p-5 space-y-4"
    >
      <h3 className="font-bold text-brand-text">
        Record result —{" "}
        <span className="text-brand-dim font-normal">
          {p1?.displayName ?? "TBD"} vs {p2?.displayName ?? "TBD"}
        </span>
      </h3>
      {err && <div className="bl-alert-error">{err}</div>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="bl-form-group">
          <label className="bl-label">Winner</label>
          <select
            className="bl-select w-44"
            value={winnerId}
            onChange={e => setWinnerId(e.target.value)}
            required
          >
            {p1 && <option value={p1.id}>{p1.displayName}</option>}
            {p2 && <option value={p2.id}>{p2.displayName}</option>}
          </select>
        </div>
        <div className="bl-form-group">
          <label className="bl-label">Winner score</label>
          <input type="number" min="0" max="99" className="bl-input w-20" value={sw}
            onChange={e => setSw(e.target.value)} required />
        </div>
        <div className="bl-form-group">
          <label className="bl-label">Loser score</label>
          <input type="number" min="0" max="99" className="bl-input w-20" value={sl}
            onChange={e => setSl(e.target.value)} required />
        </div>
        <div className="flex gap-2 self-end pb-0.5">
          <button type="submit" className="bl-btn bl-btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Confirm"}
          </button>
          <button type="button" className="bl-btn bl-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status: authStatus } = useSession();
  const [event, setEvent] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "bracket" | "participants">("overview");
  const [recordingMatch, setRecordingMatch] = useState<TMatch | null>(null);

  const isStaff = session?.user.role && ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);
  const myPlayerId = session?.user.playerId;

  async function load() {
    const r = await apiFetch<TournamentDetail>(`/api/tournaments/${encodeURIComponent(id)}`);
    if ("error" in r) setError(r.error.message);
    else { setEvent(r.data); setError(""); }
  }

  useEffect(() => {
    load().catch(() => setError("Tournament data could not be loaded."));
  }, [id]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  }

  async function register() {
    setRegistering(true);
    const r = await apiFetch(`/api/tournaments/${encodeURIComponent(id)}/participants`, {
      method: "POST", body: "{}",
    });
    setRegistering(false);
    if ("error" in r) setError(r.error.message);
    else { flash("Registration confirmed."); await load(); }
  }

  if (error && !event) return (
    <div className="bl-card p-8 text-center">
      <h1 className="text-2xl font-black text-brand-text">Tournament unavailable</h1>
      <p className="mt-2 text-brand-dim">{error}</p>
      <Link href="/tournaments" className="mt-4 inline-block text-brand-accent">
        ← Back to tournaments
      </Link>
    </div>
  );
  if (!event) return <PageSpinner />;

  const playerMap = new Map(event.participants.map(p => [p.player.id, p.player]));
  const isRegistered = myPlayerId != null && event.participants.some(p => p.player.id === myPlayerId);

  // Open matches that need a result
  const openMatches = event.matches.filter(
    m => m.status !== "COMPLETED" && m.status !== "CANCELLED" && m.player1Id && m.player2Id
  );

  const hasBracket = event.matches.length > 0;
  const isLive = event.status === "LIVE";

  return (
    <div className="space-y-6">
      {/* Top card */}
      <div className="bl-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">
                Tournament
              </p>
              {event.season && (
                <span className="text-xs text-brand-dim">· {event.season.name}</span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-black text-brand-text">{event.name}</h1>
            {event.description && (
              <p className="mt-2 max-w-xl text-sm text-brand-dim">{event.description}</p>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <Badge className={tournamentStatusClass(event.status)}>
              {event.status.replace("_", " ")}
            </Badge>

            {/* Registration CTA */}
            {event.status === "REGISTRATION" && authStatus === "authenticated" && myPlayerId && !isRegistered && (
              <button
                type="button"
                onClick={register}
                disabled={registering}
                className="bl-btn bl-btn-primary"
              >
                {registering ? "Registering…" : "Register for event"}
              </button>
            )}
            {isRegistered && (
              <span className="text-sm text-emerald-300">✓ Registered</span>
            )}
            {event.status === "REGISTRATION" && authStatus === "unauthenticated" && (
              <Link href="/login" className="bl-btn bl-btn-secondary bl-btn-sm text-sm">
                Sign in to register
              </Link>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-dim">
          <span>
            <span className="font-medium text-brand-text">{event.format.replace("_", " ")}</span>
          </span>
          {event.mapType && <span>Map: <span className="text-brand-text">{event.mapType}</span></span>}
          <span>
            Players: <span className="text-brand-text">{event._count.participants}/{event.maxPlayers}</span>
          </span>
          {event.prizeInfo && <span>Prize: <span className="text-brand-text">{event.prizeInfo}</span></span>}
          {event.startDate && <span>Starts: <span className="text-brand-text">{fmtDate(event.startDate)}</span></span>}
          {event.endDate && <span>Ended: <span className="text-brand-text">{fmtDate(event.endDate)}</span></span>}
        </div>
      </div>

      {/* Alerts */}
      {error && <div role="alert" className="bl-alert-error">{error}</div>}
      {notice && <div role="status" className="bl-alert-success">{notice}</div>}

      {/* Staff: open matches awaiting results */}
      {isStaff && isLive && openMatches.length > 0 && !recordingMatch && (
        <div className="bl-card p-5">
          <h2 className="mb-3 font-bold text-brand-text text-base">
            Open matches ({openMatches.length})
          </h2>
          <div className="space-y-2">
            {openMatches.map(m => {
              const p1 = m.player1Id ? playerMap.get(m.player1Id) : null;
              const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-surface px-4 py-3"
                >
                  <span className="text-sm font-semibold text-brand-text">
                    {p1?.displayName ?? "TBD"}
                    <span className="mx-2 font-normal text-brand-dim">vs</span>
                    {p2?.displayName ?? "TBD"}
                    <span className="ml-2 text-xs font-normal text-brand-dim">
                      R{m.round}
                      {m.bracketSide !== "winners" && m.bracketSide !== "round_robin" ? ` · ${m.bracketSide}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="bl-btn bl-btn-secondary bl-btn-sm"
                    onClick={() => {
                      setRecordingMatch(m);
                      setActiveTab("bracket");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Record result
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline result recording */}
      {recordingMatch && (
        <RecordResultForm
          match={recordingMatch}
          tournamentId={event.id}
          playerMap={playerMap}
          onDone={async () => { setRecordingMatch(null); flash("Result recorded."); await load(); }}
          onCancel={() => setRecordingMatch(null)}
        />
      )}

      {/* Tabs */}
      <div>
        <div className="flex border-b border-brand-border">
          {(["overview", "participants", hasBracket ? "bracket" : null] as const)
            .filter(Boolean)
            .map(tab => (
              <button
                key={tab!}
                type="button"
                onClick={() => setActiveTab(tab!)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-brand-accent text-brand-text"
                    : "text-brand-dim hover:text-brand-text"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "participants" ? `Participants (${event._count.participants})` : "Bracket"}
              </button>
            ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Format",  value: event.format.replace("_", " ") },
              { label: "Prize",   value: event.prizeInfo || "To be announced" },
              { label: "Season",  value: event.season?.name || "Unassigned" },
              { label: "Players", value: `${event._count.participants} / ${event.maxPlayers}` },
            ].map(s => (
              <div key={s.label} className="bl-stat">
                <span className="bl-stat-label">{s.label}</span>
                <span className="bl-stat-value text-brand-text">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Participants tab */}
        {activeTab === "participants" && (
          <div className="mt-6">
            {event.participants.length === 0 ? (
              <div className="bl-card"><EmptyState message="No registered players yet" /></div>
            ) : (
              <div className="bl-card divide-y divide-brand-border">
                {event.participants
                  .slice()
                  .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
                  .map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.seed != null && (
                          <span className="w-6 text-center text-xs font-bold text-brand-dim">
                            #{p.seed}
                          </span>
                        )}
                        <div>
                          <Link
                            href={`/players/${p.player.id}`}
                            className="font-semibold text-brand-text hover:text-brand-accent"
                          >
                            {p.player.displayName}
                          </Link>
                          <span className="ml-2 text-xs text-brand-dim">
                            @{p.player.username}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <TierBadge tier={p.player.tier} size="sm" />
                        <span className="w-12 text-right text-sm font-bold tabular-nums text-brand-text">
                          {p.player.rating}
                        </span>
                        <Badge
                          className={
                            p.status === "WINNER"     ? "bg-amber-900/60 text-amber-200" :
                            p.status === "ELIMINATED" ? "bg-red-900/40 text-red-400" :
                            p.status === "ACTIVE"     ? "bg-green-900/40 text-green-300" :
                            "bg-brand-muted text-brand-dim"
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Bracket tab */}
        {activeTab === "bracket" && hasBracket && (
          <div className="mt-6 bl-card p-5">
            <BracketView matches={event.matches} playerMap={playerMap} />
          </div>
        )}
      </div>
    </div>
  );
}
