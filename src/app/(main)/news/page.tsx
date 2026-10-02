"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDate } from "@/src/lib/utils";

interface Article { id: string; slug: string; title: string; excerpt: string | null; category: string; publishedAt: string | null; author: { username: string } | null }
interface NewsResponse { items: Article[]; pagination: { total: number } }
export default function NewsPage() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiFetch<NewsResponse>("/api/news?page=1&pageSize=30").then((result) => { if ("error" in result) setError(true); else setData(result.data); }).catch(() => setError(true)); }, []);
  return <div className="space-y-6"><div className="bl-page-header"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Media</p><h1 className="bl-page-title text-3xl">News</h1></div>{data && <Badge className="bg-brand-accent/10 text-brand-accent">{data.pagination.total} updates</Badge>}</div>{error ? <div className="bl-alert-error">News could not be loaded.</div> : !data ? <PageSpinner /> : data.items.length === 0 ? <div className="bl-card"><EmptyState message="No published articles" sub="Announcements and competitive updates will appear here." /></div> : <div className="space-y-4">{data.items.map((article) => <Link key={article.id} href={`/news/${article.slug}`} className="bl-card block p-5 transition-colors hover:border-brand-accent/40"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="text-xs uppercase tracking-[0.2em] text-brand-dim">{article.category.replaceAll("_", " ")}</div><h2 className="mt-2 text-2xl font-bold text-brand-text">{article.title}</h2></div><div className="text-sm text-brand-dim">{fmtDate(article.publishedAt)}</div></div><p className="mt-3 text-brand-dim">{article.excerpt || "Read the latest update from the Bloodline community."}</p><div className="mt-4 text-xs text-brand-dim">{article.author?.username || "Bloodline staff"}</div></Link>)}</div>}</div>;
}
