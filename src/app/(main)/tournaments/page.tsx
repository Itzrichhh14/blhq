"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDate } from "@/src/lib/utils";

interface Tournament {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  prizeInfo: string | null;
  mapType: string | null;
  maxPlayers: number;
  startDate: string | null;
  description: string | null;
  _count: { participants: number };
  season: { name: string } | null;
}
interface TournamentResponse { items: Tournament[]; pagination: { total: number } }

export default function TournamentsPage() {
  const [data, setData] = useState<TournamentResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiFetch<TournamentResponse>("/api/tournaments?page=1&pageSize=50").then((result) => {
      if ("error" in result) setError(true);
      else setData(result.data);
    }).catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bl-page-header flex-col sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Circuit</p>
          <h1 className="bl-page-title text-3xl">Tournaments</h1>
        </div>
        {data && <Badge className="bg-brand-accent/10 text-brand-accent">{data.pagination.total} events</Badge>}
      </div>
      {error ? (
        <div className="bl-alert-error">Tournament data could not be loaded. Please try again later.</div>
      ) : !data ? (
        <PageSpinner />
      ) : data.items.length === 0 ? (
        <div className="bl-card"><EmptyState message="No tournaments scheduled" sub="New events will appear here when published." /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.items.map((tournament) => (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="bl-card block p-5 transition-transform hover:-translate-y-0.5 hover:border-brand-accent/40">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-brand-text">{tournament.name}</h2>
                <Badge className={tournament.status === "LIVE" ? "bg-green-900/50 text-green-300" : tournament.status === "UPCOMING" ? "bg-amber-900/50 text-amber-300" : "bg-blue-900/50 text-blue-300"}>{tournament.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-3 min-h-12 text-sm leading-6 text-brand-dim">{tournament.description || "Tournament details will be announced soon."}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-brand-border bg-brand-surface p-2">
                  <div className="text-xs text-brand-dim">Format</div>
                  <div className="mt-1 font-semibold text-brand-text">{tournament.format.replaceAll("_", " ")}</div>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-surface p-2">
                  <div className="text-xs text-brand-dim">Prize</div>
                  <div className="mt-1 font-semibold text-brand-text">{tournament.prizeInfo || "TBA"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-brand-dim">
                <span>{tournament.season?.name ?? (tournament.startDate ? fmtDate(tournament.startDate) : "Date TBA")}</span>
                <span>{tournament._count.participants}/{tournament.maxPlayers} players</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
