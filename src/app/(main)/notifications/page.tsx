"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtRelative } from "@/src/lib/utils";

interface Notice { id: string; type: string; title: string; message: string; read: boolean; createdAt: string }
interface NoticeResponse { items: Notice[]; pagination: { total: number } }
export default function NotificationsPage() {
  const [data, setData] = useState<NoticeResponse | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() { const result = await apiFetch<NoticeResponse>("/api/notifications?page=1&pageSize=50"); if ("error" in result) setError(true); else setData(result.data); }
  useEffect(() => { load().catch(() => setError(true)); }, []);
  async function markOne(id: string) { await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }); setData((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, read: true } : item) } : current); }
  async function markAll() { setBusy(true); const result = await apiFetch("/api/notifications/read-all", { method: "POST" }); setBusy(false); if ("error" in result) setError(true); else setData((current) => current ? { ...current, items: current.items.map((item) => ({ ...item, read: true })) } : current); }
  return <div className="space-y-6"><div className="bl-page-header"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Account</p><h1 className="bl-page-title text-3xl">Notifications</h1></div><button type="button" className="bl-btn bl-btn-secondary bl-btn-sm" onClick={markAll} disabled={busy || !data?.items.some((item) => !item.read)}>{busy ? "Updating…" : "Mark all read"}</button></div>{error ? <div className="bl-alert-error">Notifications require an active account and could not be loaded.</div> : !data ? <PageSpinner /> : data.items.length === 0 ? <div className="bl-card"><EmptyState message="You’re all caught up" sub="New match, challenge, and ranking activity will show here." /></div> : <div className="bl-card divide-y divide-brand-border">{data.items.map((item) => <div key={item.id} className={`flex items-start justify-between gap-4 p-5 ${item.read ? "opacity-70" : "bg-brand-accent/[0.03]"}`}><div className="flex gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-brand-dim/30" : "bg-brand-accent"}`} /><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-brand-text">{item.title}</h2><Badge className="bg-brand-muted text-brand-dim">{item.type.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-sm text-brand-dim">{item.message}</p><p className="mt-2 text-xs text-brand-dim">{fmtRelative(item.createdAt)}</p></div></div>{!item.read && <button type="button" title="Mark as read" aria-label={`Mark ${item.title} as read`} className="bl-btn bl-btn-ghost bl-btn-sm shrink-0" onClick={() => markOne(item.id)}>Read</button>}</div>)}</div>}</div>;
}
