import Link from "next/link";
import { LiveOverview } from "@/src/components/home/LiveOverview";

const features = [
  { title: "Live rankings", description: "Track the climb of every player by rating, tier, and streak." },
  { title: "Competitive matches", description: "Follow results, challenge opponents, and review recent history." },
  { title: "Season progression", description: "Monitor rank movement, tournament activity, and performance trends." },
  { title: "Admin control", description: "Manage alerts, results, seasons, and staff-led decisions centrally." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-brand-accent/30 bg-brand-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Competitive gaming ecosystem
            </p>
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-brand-text sm:text-5xl lg:text-6xl">
              BLOODLINE
            </h1>
            <p className="mt-5 max-w-xl text-lg text-brand-dim">
              A competitive platform for players, teams, rankings, tournaments, and progression.
              Built for a serious esports community where skill, season performance, and legacy matter.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rankings" className="bl-btn bl-btn-primary">
                View rankings
              </Link>
              <Link href="/login" className="bl-btn bl-btn-secondary">
                Sign in
              </Link>
            </div>

            <div className="mt-10">
              <LiveOverview />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dim">Platform</p>
          <h2 className="mt-2 text-3xl font-black text-brand-text">Everything a competitive org needs</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((item) => (
            <div key={item.title} className="bl-card p-5">
              <div className="mb-3 h-10 w-10 rounded-md bg-brand-accent/10 ring-1 ring-brand-accent/30" />
              <h3 className="text-lg font-bold text-brand-text">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-brand-dim">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
