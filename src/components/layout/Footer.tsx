import Link from "next/link";

const navigation = [
  { href: "/rankings", label: "Rankings" },
  { href: "/players", label: "Players" },
  { href: "/matches", label: "Matches" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/news", label: "News" },
];

export function Footer() {
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.com";

  return (
    <footer className="border-t border-brand-border bg-[#090b10]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="text-xl font-black uppercase text-brand-text">BLOODLINE<span className="text-emerald-300">.</span></Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-brand-dim">Una comunidad competitiva construida alrededor del juego limpio, el progreso y los rivales que te obligan a subir el nivel.</p>
          <a href={discordUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-300/20">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
            Join the Discord
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="flex flex-col justify-between gap-8 md:items-end">
          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 md:text-right">
            {navigation.map((item) => <Link key={item.href} href={item.href} className="text-brand-dim transition-colors hover:text-brand-text">{item.label}</Link>)}
            <Link href="/apply" className="text-brand-dim transition-colors hover:text-brand-text">Apply</Link>
            <Link href="/seasons" className="text-brand-dim transition-colors hover:text-brand-text">Seasons</Link>
            <Link href="/teams" className="text-brand-dim transition-colors hover:text-brand-text">Teams</Link>
          </nav>
          <div className="text-xs text-brand-dim/70 md:text-right">© {new Date().getFullYear()} Bloodline Competitive. Built for the climb.</div>
        </div>
      </div>
    </footer>
  );
}
