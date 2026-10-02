"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageSpinner } from "@/src/components/ui/Spinner";
import { apiFetch, fmtDate } from "@/src/lib/utils";

interface Article { id: string; slug: string; title: string; excerpt: string | null; content: string; category: string; publishedAt: string | null; author: { username: string } | null }
export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiFetch<Article>(`/api/news/${encodeURIComponent(slug)}`).then((result) => { if ("error" in result) setError(true); else setArticle(result.data); }).catch(() => setError(true)); }, [slug]);
  if (error) return <div className="bl-card p-8 text-center"><h1 className="text-2xl font-black text-brand-text">Article not found</h1><Link href="/news" className="mt-4 inline-block text-brand-accent">Back to news</Link></div>;
  if (!article) return <PageSpinner />;
  return <div className="space-y-6"><header className="bl-card p-6"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">{article.category.replaceAll("_", " ")}</div><h1 className="mt-3 text-4xl font-black text-brand-text">{article.title}</h1>{article.excerpt && <p className="mt-4 text-lg text-brand-dim">{article.excerpt}</p>}<div className="mt-4 flex flex-wrap gap-3 text-sm text-brand-dim"><span>{article.author?.username || "Bloodline staff"}</span><span>·</span><span>{fmtDate(article.publishedAt)}</span></div></header><article className="bl-card p-6"><div className="whitespace-pre-wrap text-brand-dim leading-7">{article.content}</div></article><Link href="/news" className="inline-block text-sm text-brand-accent hover:underline">Back to all news</Link></div>;
}
