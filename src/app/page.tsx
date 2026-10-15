import Link from "next/link";
import { LiveOverview } from "@/src/components/home/LiveOverview";

const destinations = [
  { number: "01", title: "El ranking", detail: "Cada victoria deja huella.", href: "/rankings", accent: "text-emerald-300" },
  { number: "02", title: "Los duelos", detail: "Rivales reales. Resultados registrados.", href: "/matches", accent: "text-cyan-300" },
  { number: "03", title: "El circuito", detail: "Torneos y temporadas en movimiento.", href: "/tournaments", accent: "text-rose-300" },
];

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: "Bloodline Competitive",
  sport: "Esports",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://bloodline.gg",
  description: "Competitive duels, player rankings, tournaments, and community recruitment.",
};

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#080a0f] text-brand-text">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative isolate flex min-h-[640px] items-end sm:min-h-[700px]">
        <div
          role="img"
          aria-label="Arena de esports iluminada durante un torneo competitivo"
          className="absolute inset-0 -z-20 bg-cover bg-[center_42%]"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=2400&q=85')" }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,10,0.96)_0%,rgba(5,7,10,0.78)_42%,rgba(5,7,10,0.16)_100%),linear-gradient(0deg,rgba(5,7,10,0.96)_0%,transparent_62%)]" />
        <div className="absolute inset-y-0 right-[10%] -z-10 hidden w-px bg-emerald-200/30 lg:block" />
        <div className="mx-auto grid w-full max-w-7xl items-end gap-10 px-4 pb-16 pt-24 sm:px-6 sm:pb-20 lg:grid-cols-[1fr_300px] lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase text-emerald-200">
              <span className="h-px w-10 bg-emerald-300" />
              Timebomb Duels · Competición abierta
            </div>
            <h1 className="max-w-3xl text-6xl font-black uppercase leading-[0.88] text-white sm:text-7xl lg:text-8xl">Bloodline</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Cada duelo cuenta. Sube de rango, encuentra rivales y deja tu nombre en el circuito competitivo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rankings" className="bl-btn bl-btn-primary min-h-12 px-6">Explorar ranking <span aria-hidden="true">↗</span></Link>
              <Link href="/register" className="bl-btn min-h-12 border border-white/40 bg-black/20 px-6 text-white hover:bg-white/10">Crear cuenta</Link>
            </div>
          </div>
          <aside className="hidden border-l border-white/30 pl-5 text-white lg:block">
            <p className="text-[11px] font-bold uppercase text-emerald-200">El siguiente paso</p>
            <p className="mt-3 text-2xl font-black leading-tight">No mires la tabla.<br />Escálala.</p>
            <Link href="/apply" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-emerald-200">Solicita entrar al roster <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </section>

      <section aria-label="Bloodline live stats" className="border-y border-brand-border bg-[#0c1015]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <LiveOverview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase text-emerald-300">Tu camino competitivo</p><h2 className="mt-3 max-w-xl text-3xl font-black text-white sm:text-4xl">Del primer duelo a la cima.</h2></div>
          <p className="max-w-md text-sm leading-6 text-brand-dim">Perfiles, resultados y progreso conectados en un solo circuito. Juega, compite y vuelve a intentarlo.</p>
        </div>
        <div className="divide-y divide-brand-border border-y border-brand-border md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
          {destinations.map((item) => <Link key={item.href} href={item.href} className="group flex min-h-40 items-start justify-between gap-4 py-6 md:px-6 md:first:pl-0 md:last:pr-0"><div><div className={`text-xs font-bold ${item.accent}`}>{item.number}</div><h3 className="mt-5 text-xl font-black text-white">{item.title}</h3><p className="mt-2 text-sm text-brand-dim">{item.detail}</p></div><span className="mt-1 text-xl text-brand-dim transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-emerald-300" aria-hidden="true">↗</span></Link>)}
        </div>
      </section>

      <section className="border-y border-emerald-300/20 bg-[linear-gradient(110deg,#0d1918,#10131a_55%,#1b1018)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="text-xs font-bold uppercase text-emerald-300">La próxima historia puede ser la tuya</p><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">El roster está buscando nuevos rivales.</h2><p className="mt-2 max-w-xl text-sm text-brand-dim">Presenta tu experiencia y el equipo revisará tu solicitud.</p></div>
          <Link href="/apply" className="bl-btn bl-btn-primary min-h-12 shrink-0 px-6">Aplicar al roster <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
