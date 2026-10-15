"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/src/lib/utils";

const regions = ["NA", "EU", "ASIA", "OCE", "SA", "OTHER"];
const maps = ["ARENA", "TRACKING", "TIMED"];

export default function ApplyPage() {
  const [form, setForm] = useState({ username: "", discordTag: "", region: "NA", ageBracket: "18+", mainMap: "", experience: "", currentRank: "", competitiveHistory: "", whyBloodline: "", clips: "" });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await apiFetch("/api/applications", {
      method: "POST",
      body: JSON.stringify({ ...form, mainMap: form.mainMap || undefined, clips: form.clips || undefined }),
    });
    setBusy(false);
    if ("error" in result) setError(result.error.message);
    else setSubmitted(true);
  }

  if (submitted) {
    return <main className="mx-auto max-w-2xl px-4 py-16"><section className="bl-card p-8 text-center"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Application received</div><h1 className="mt-3 text-3xl font-black text-brand-text">Your trial starts here.</h1><p className="mt-4 text-brand-dim">The staff team will review your details. Keep an eye on the contact method you provided.</p><Link href="/" className="bl-btn bl-btn-primary mt-6">Back to Bloodline</Link></section></main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-brand-dim hover:text-brand-text">← Back to home</Link>
      <div className="mb-7 mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Recruitment</p><h1 className="mt-2 text-4xl font-black text-brand-text">Apply to Bloodline</h1><p className="mt-3 max-w-2xl text-brand-dim">Tell the competitive team how you play, what you have accomplished, and what you want to build here.</p></div>
      <form onSubmit={submit} className="bl-card space-y-6 p-5 sm:p-7">
        {error && <div role="alert" className="bl-alert-error">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bl-form-group"><label htmlFor="app-username" className="bl-label">Roblox username</label><input id="app-username" className="bl-input" minLength={2} maxLength={50} required value={form.username} onChange={(e) => set("username", e.target.value)} /></div>
          <div className="bl-form-group"><label htmlFor="app-discord" className="bl-label">Discord username</label><input id="app-discord" className="bl-input" minLength={2} maxLength={50} required value={form.discordTag} onChange={(e) => set("discordTag", e.target.value)} placeholder="name or name#0000" /></div>
          <div className="bl-form-group"><label htmlFor="app-region" className="bl-label">Region</label><select id="app-region" className="bl-select" value={form.region} onChange={(e) => set("region", e.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="bl-form-group"><label htmlFor="app-age" className="bl-label">Age bracket</label><select id="app-age" className="bl-select" value={form.ageBracket} onChange={(e) => set("ageBracket", e.target.value)}><option>13-15</option><option>16-17</option><option>18+</option></select></div>
          <div className="bl-form-group"><label htmlFor="app-map" className="bl-label">Main map <span className="font-normal">(optional)</span></label><select id="app-map" className="bl-select" value={form.mainMap} onChange={(e) => set("mainMap", e.target.value)}><option value="">Choose later</option>{maps.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="bl-form-group"><label htmlFor="app-rank" className="bl-label">Current rank</label><input id="app-rank" className="bl-input" minLength={2} maxLength={50} required value={form.currentRank} onChange={(e) => set("currentRank", e.target.value)} /></div>
        </div>
        <div className="bl-form-group"><label htmlFor="app-experience" className="bl-label">Competitive experience</label><textarea id="app-experience" className="bl-input min-h-24" minLength={10} maxLength={2000} required value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="Teams, roles, and what you have learned…" /></div>
        <div className="bl-form-group"><label htmlFor="app-history" className="bl-label">Competitive history</label><textarea id="app-history" className="bl-input min-h-24" minLength={10} maxLength={2000} required value={form.competitiveHistory} onChange={(e) => set("competitiveHistory", e.target.value)} placeholder="Events, placements, or notable matches…" /></div>
        <div className="bl-form-group"><label htmlFor="app-why" className="bl-label">Why Bloodline?</label><textarea id="app-why" className="bl-input min-h-28" minLength={20} maxLength={3000} required value={form.whyBloodline} onChange={(e) => set("whyBloodline", e.target.value)} placeholder="What would you bring to the team?" /></div>
        <div className="bl-form-group"><label htmlFor="app-clips" className="bl-label">Clips or portfolio <span className="font-normal">(optional)</span></label><textarea id="app-clips" className="bl-input min-h-20" maxLength={2000} value={form.clips} onChange={(e) => set("clips", e.target.value)} placeholder="Links to clips, VODs, or stats…" /></div>
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-brand-border pt-5 sm:flex-row sm:items-center"><p className="text-xs text-brand-dim">Submitting allows staff to review the information in this application.</p><button type="submit" className="bl-btn bl-btn-primary" disabled={busy}>{busy ? "Sending application…" : "Submit application"}</button></div>
      </form>
    </main>
  );
}
