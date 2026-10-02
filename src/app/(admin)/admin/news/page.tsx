"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/utils";

const categories = ["ANNOUNCEMENT", "TOURNAMENT", "COMPETITIVE", "COMMUNITY", "PATCH_NOTES"];
export default function AdminNewsPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [publishNow, setPublishNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function changeTitle(value: string) { setTitle(value); setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); setMessage(""); const result = await apiFetch<{ slug: string }>("/api/admin/news", { method: "POST", body: JSON.stringify({ title, slug, excerpt: excerpt || undefined, content, category, publishedAt: publishNow ? new Date().toISOString() : undefined }) }); setBusy(false); if ("error" in result) setError(result.error.message); else { setMessage(publishNow ? "Article published." : "Draft saved."); setTitle(""); setSlug(""); setExcerpt(""); setContent(""); } }
  return <div className="mx-auto max-w-3xl space-y-6"><div><Link href="/admin" className="text-sm text-brand-dim hover:text-brand-text">← Admin</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Editorial</p><h1 className="mt-2 text-3xl font-black text-brand-text">Write an article</h1></div><form onSubmit={submit} className="bl-card space-y-5 p-6">{error && <div className="bl-alert-error">{error}</div>}{message && <div className="bl-alert-success">{message} <Link href="/news" className="underline">View news</Link></div>}<div className="bl-form-group"><label htmlFor="title" className="bl-label">Title</label><input id="title" className="bl-input" minLength={5} maxLength={200} required value={title} onChange={(event) => changeTitle(event.target.value)} /></div><div className="bl-form-group"><label htmlFor="slug" className="bl-label">URL slug</label><input id="slug" className="bl-input" pattern="[a-z0-9-]+" minLength={3} maxLength={150} required value={slug} onChange={(event) => setSlug(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="bl-form-group"><label htmlFor="category" className="bl-label">Category</label><select id="category" className="bl-select" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><label className="flex items-center gap-3 self-end pb-2 text-sm text-brand-text"><input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} />Publish immediately</label></div><div className="bl-form-group"><label htmlFor="excerpt" className="bl-label">Excerpt</label><textarea id="excerpt" className="bl-input min-h-20" maxLength={500} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} /></div><div className="bl-form-group"><label htmlFor="content" className="bl-label">Article</label><textarea id="content" className="bl-input min-h-64" minLength={10} required value={content} onChange={(event) => setContent(event.target.value)} /></div><div className="flex justify-end"><button type="submit" className="bl-btn bl-btn-primary" disabled={busy}>{busy ? "Saving…" : publishNow ? "Publish article" : "Save draft"}</button></div></form></div>;
}
