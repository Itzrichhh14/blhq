"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDate, tournamentStatusClass } from "@/src/lib/utils";

interface Participant {
  id: string;
  seed: number | null;
  status: string;
  player: { id: string; username: string; displayName: string; tier: string; rating: number };
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
  participants: Participant[];
  matches: TMatch[];
  season: { name: string } | null;
  _count: { participants: number };
}

interface TournamentRow {
  id: string;
  name: string;
  status: string;
  format: string;
  maxPlayers: number;
  startDate: string | null;
  _count: { participants: number };
  season: { name: string } | null;
}

interface TournamentList {
  items: TournamentRow[];
  pagination: { total: number };
}

export default function AdminTournamentsPage() {
  const { data: session, status: authStatus } = useSession();
  const isStaff = session?.user.role && ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);

  const [list, setList] = useState<TournamentList | null>(null);
  const [selected, setSelected] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Result recording state
  const [recordingMatchId, setRecordingMatchId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState("");
  const [scoreWinner, setScoreWinner] = useState("1");
  const [scoreLoser, setScoreLoser] = useState("0");

  async function loadList() {
    const r = await apiFetch<TournamentList>("/api/tournaments?page=1&pageSize=50");
    if ("error" in r) setError(r.error.message);
    else setList(r.data);
  }

  async function loadDetail(id: string) {
    const r = await apiFetch<TournamentDetail>(`/api/tournaments/${encodeURIComponent(id)}`);
    if ("error" in r) setError(r.error.message);
    else { setSelected(r.data); setRecordingMatchId(null); }
  }

  useEffect(() => {
    if (authStatus === "authenticated") loadList().catch(() => setError("Could not load tournaments."));
  }, [authStatus]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  }

  async function startTournament(id: string) {
    setBusy(true); setError("");
    const r = await apiFetch(`/api/tournaments/${encodeURIComponent(id)}/start`, { method: "POST" });
    setBusy(false);
    if ("error" in r) setError(r.error.message);
    else { flash("Tournament started — bracket generated."); await loadList(); await loadDetail(id); }
  }

  async function recordResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !recordingMatchId) return;
    setBusy(true); setError("");

    // Derive loserId from match participants
    const match = selected.matches.find(m => m.id === recordingMatchId);
    const p1 = match?.player1Id;
    const p2 = match?.player2Id;
    const loserId = winnerId === p1 ? p2 : p1;

    if (!loserId) { setError("Cannot determine loser — match is incomplete."); setBusy(false); return; }

    const r = await apiFetch(`/api/tournaments/${encodeURIComponent(selected.id)}/result`, {
      method: "POST",
      body: JSON.stringify({
        tournamentMatchId: recordingMatchId,
        winnerId,
        loserId,
        scoreWinner: Number(scoreWinner),
        scoreLoser: Number(scoreLoser),
      }),
    });
    setBusy(false);
    if ("error" in r) { setError(r.error.message); }
    else {
      flash("Result recorded.");
      setRecordingMatchId(null);
      await loadDetail(selected.id);
      await loadList();
    }
  }

  if (authStatus === "loading") return <PageSpinner />;
  if (!isStaff) return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="bl-alert-error">Staff access required to manage tournaments.</div>
    </main>
  );

  // Player lookup map for the selected tournament
  const playerMap = new Map(
    selected?.participants.map(p => [p.player.id, p.player]) ?? []
  );

  // Group matches by round for display
  const matchesByRound = selected
    ? selected.matches.reduce<Record<number, TMatch[]>>((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
      }, {})
    : {};

  const openMatches = selected?.matches.filter(
    m => m.status !== "COMPLETED" && m.status !== "CANCELLED" && m.player1Id && m.player2Id
  ) ?? [];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-sm text-brand-dim hover:text-brand-text">← Admin</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Operations</p>
            <h1 className="mt-2 text-3xl font-black text-white">Tournament control</h1>
          </div>
          {list && (
            <Badge className="bg-brand-muted text-brand-dim">
              {list.pagination.total} events
            </Badge>
          )}
        </div>
      </div>

      {error && <div role="alert" className="bl-alert-error">{error}</div>}
      {notice && <div role="status" className="bl-alert-success">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: Tournament List */}
        <section className="bl-card divide-y divide-brand-border overflow-hidden">
          <div className="bl-card-header text-sm">All Tournaments</div>
          {!list ? (
            <PageSpinner />
          ) : list.items.length === 0 ? (
            <EmptyState message="No tournaments" />
          ) : (
            list.items.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadDetail(t.id)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-muted/40 ${selected?.id === t.id ? "bg-brand-muted/50" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-brand-text">{t.name}</p>
                  <p className="mt-0.5 text-xs text-brand-dim">
                    {t.format.replace("_", " ")} · {t._count.participants}/{t.maxPlayers}
                    {t.startDate ? ` · ${fmtDate(t.startDate)}` : ""}
                  </p>
                </div>
                <Badge className={tournamentStatusClass(t.status)}>{t.status.replace("_", " ")}</Badge>
              </button>
            ))
          )}
        </section>

        {/* Right: Tournament Detail & Controls */}
        {!selected ? (
          <div className="bl-card flex items-center justify-center p-12">
            <EmptyState message="Select a tournament" sub="View participants, bracket, and record results." />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Tournament header */}
            <div className="bl-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">
                    {selected.format.replace("_", " ")}
                    {selected.mapType ? ` · ${selected.mapType}` : ""}
                    {selected.season ? ` · ${selected.season.name}` : ""}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-brand-text">{selected.name}</h2>
                  {selected.description && (
                    <p className="mt-2 text-sm text-brand-dim">{selected.description}</p>
                  )}
                </div>
                <Badge className={tournamentStatusClass(selected.status)}>
                  {selected.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {(selected.status === "REGISTRATION" || selected.status === "UPCOMING") && (
                  <button
                    type="button"
                    className="bl-btn bl-btn-primary"
                    disabled={busy || selected.participants.length < 2}
                    onClick={() => startTournament(selected.id)}
                    title={selected.participants.length < 2 ? "Need at least 2 participants to start" : ""}
                  >
                    {busy ? "Starting…" : `Start tournament (${selected.participants.length} players)`}
                  </button>
                )}
                <Link
                  href={`/tournaments/${selected.id}`}
                  className="bl-btn bl-btn-secondary"
                  target="_blank"
                >
                  Public view ↗
                </Link>
              </div>
            </div>

            {/* Participants */}
            {selected.participants.length > 0 && (
              <div className="bl-card p-5">
                <h3 className="mb-3 font-bold text-brand-text">
                  Participants ({selected.participants.length}/{selected.maxPlayers})
                </h3>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {selected.participants
                    .slice()
                    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
                    .map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-brand-border bg-brand-bg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-brand-text">
                            {p.seed != null ? `#${p.seed} ` : ""}{p.player.displayName}
                          </span>
                          <span className="text-xs text-brand-dim">{p.player.tier} · {p.player.rating}</span>
                        </div>
                        <Badge
                          className={
                            p.status === "WINNER" ? "bg-amber-900/60 text-amber-200" :
                            p.status === "ELIMINATED" ? "bg-red-900/40 text-red-400" :
                            p.status === "ACTIVE" ? "bg-green-900/40 text-green-300" :
                            "bg-brand-muted text-brand-dim"
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Bracket / Matches */}
            {selected.matches.length > 0 && (
              <div className="bl-card p-5">
                <h3 className="mb-4 font-bold text-brand-text">Bracket</h3>

                {Object.entries(matchesByRound)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([round, matches]) => (
                    <div key={round} className="mb-5">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-dim">
                        {matches[0]?.bracketSide === "grand_finals"
                          ? "Grand Finals"
                          : matches[0]?.bracketSide === "losers"
                          ? `Losers Round ${round}`
                          : `Round ${round}`}
                      </div>
                      <div className="space-y-2">
                        {matches
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .map(m => {
                            const p1 = m.player1Id ? playerMap.get(m.player1Id) : null;
                            const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                            const winner = m.winnerId ? playerMap.get(m.winnerId) : null;
                            const canRecord = m.status !== "COMPLETED" && m.status !== "CANCELLED" && !!m.player1Id && !!m.player2Id;

                            return (
                              <div
                                key={m.id}
                                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                                  m.status === "COMPLETED"
                                    ? "border-brand-border bg-brand-surface/50 opacity-70"
                                    : "border-brand-border bg-brand-surface"
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-brand-text">
                                      <span className={m.winnerId === m.player1Id ? "text-emerald-300" : ""}>
                                        {p1?.displayName ?? <span className="text-brand-dim/50">TBD</span>}
                                      </span>
                                      <span className="mx-2 text-brand-dim">vs</span>
                                      <span className={m.winnerId === m.player2Id ? "text-emerald-300" : ""}>
                                        {p2?.displayName ?? <span className="text-brand-dim/50">TBD</span>}
                                      </span>
                                    </div>
                                    {m.status === "COMPLETED" && winner && (
                                      <p className="mt-0.5 text-xs text-brand-dim">
                                        Winner: <span className="text-emerald-300">{winner.displayName}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={
                                      m.status === "COMPLETED"
                                        ? "bg-gray-800 text-gray-400"
                                        : m.status === "LIVE"
                                        ? "bg-green-900/50 text-green-300"
                                        : "bg-blue-900/40 text-blue-300"
                                    }
                                  >
                                    {m.status}
                                  </Badge>
                                  {canRecord && (
                                    <button
                                      type="button"
                                      className="bl-btn bl-btn-secondary bl-btn-sm text-xs"
                                      onClick={() => {
                                        setRecordingMatchId(m.id);
                                        setWinnerId(m.player1Id ?? "");
                                        setScoreWinner("1");
                                        setScoreLoser("0");
                                      }}
                                    >
                                      Record result
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Inline result recording form */}
            {recordingMatchId && (() => {
              const match = selected.matches.find(m => m.id === recordingMatchId)!;
              const p1 = match.player1Id ? playerMap.get(match.player1Id) : null;
              const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;
              return (
                <div className="bl-card border-brand-accent/40 p-5">
                  <h3 className="mb-4 font-bold text-brand-text">
                    Record result:{" "}
                    <span className="text-brand-dim">
                      {p1?.displayName} vs {p2?.displayName}
                    </span>
                  </h3>
                  <form onSubmit={recordResult} className="flex flex-wrap items-end gap-3">
                    <div className="bl-form-group">
                      <label className="bl-label">Winner</label>
                      <select
                        className="bl-select w-48"
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
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className="bl-input w-20"
                        value={scoreWinner}
                        onChange={e => setScoreWinner(e.target.value)}
                        required
                      />
                    </div>
                    <div className="bl-form-group">
                      <label className="bl-label">Loser score</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className="bl-input w-20"
                        value={scoreLoser}
                        onChange={e => setScoreLoser(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bl-btn bl-btn-primary"
                        disabled={busy}
                      >
                        {busy ? "Saving…" : "Confirm result"}
                      </button>
                      <button
                        type="button"
                        className="bl-btn bl-btn-ghost"
                        onClick={() => setRecordingMatchId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </main>
  );
}
