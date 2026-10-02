"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { rarityClass } from "@/src/lib/utils";

interface Achievement { id: string; key: string; name: string; description: string; rarity: string; iconKey: string | null }
export default function AchievementsPage() {
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { fetch("/api/achievements").then((response) => response.json()).then((body) => { if (!body.success) setError(true); else setItems(body.data); }).catch(() => setError(true)); }, []);
  return <div className="space-y-6"><div className="bl-page-header"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Progression</p><h1 className="bl-page-title text-3xl">Achievements</h1></div>{items && <Badge className="bg-brand-accent/10 text-brand-accent">{items.length} milestones</Badge>}</div>{error ? <div className="bl-alert-error">Achievements could not be loaded.</div> : !items ? <PageSpinner /> : items.length === 0 ? <div className="bl-card"><EmptyState message="No achievements configured" /></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="bl-card p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-dim">{item.key.replaceAll("_", " ")}</div><h2 className="mt-2 text-xl font-bold text-brand-text">{item.name}</h2></div><Badge className={rarityClass(item.rarity)}>{item.rarity}</Badge></div><p className="mt-3 text-sm leading-6 text-brand-dim">{item.description}</p></article>)}</div>}</div>;
}
