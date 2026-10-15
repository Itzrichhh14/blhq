"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/src/lib/utils";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      setQ("");
    }
  }

  const isStaff = session?.user.role && ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);

  const links = [
    { href: "/rankings", label: "Ranking" },
    { href: "/players", label: "Jugadores" },
    { href: "/matches", label: "Partidos" },
    { href: "/tournaments", label: "Torneos" },
    { href: "/seasons", label: "Temporadas" },
    { href: "/teams", label: "Equipos" },
    { href: "/news", label: "Noticias" },
  ];

  function navClass(href: string) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return cn(
      "rounded px-3 py-2 text-sm transition-colors",
      active ? "bg-brand-muted text-brand-text" : "text-brand-dim hover:bg-brand-muted/60 hover:text-brand-text"
    );
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-brand-border bg-[#080a0f]/95 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
        <span className="text-brand-text font-black text-lg uppercase">
          BLOODLINE<span className="text-emerald-300">.</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden items-center gap-0.5 lg:flex">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={navClass(href)}
          >
            {label}
          </Link>
        ))}
        {isStaff && (
          <Link
            href="/admin"
            className={navClass("/admin")}
          >
            Admin
          </Link>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="ml-auto hidden w-full max-w-56 lg:block">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search players, teams…"
          className="w-full h-8 px-3 text-sm bg-brand-bg border border-brand-border rounded
                     text-brand-text placeholder-brand-dim/60 focus:outline-none focus:border-brand-accent/50"
        />
      </form>

      <Link href="/search" aria-label="Buscar" title="Buscar" className="hidden rounded px-2 py-1.5 text-lg text-brand-dim hover:bg-brand-muted hover:text-brand-text sm:inline-flex lg:hidden">⌕</Link>

      <Link href="/apply" className="hidden rounded border border-emerald-300/35 px-3 py-1.5 text-xs font-bold uppercase text-emerald-200 transition-colors hover:bg-emerald-300/10 sm:inline-flex">Apply</Link>

      <button
        type="button"
        className="ml-auto inline-flex h-9 w-9 flex-col items-center justify-center gap-1 rounded border border-brand-border text-brand-text lg:hidden"
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span className={cn("h-0.5 w-4 bg-current transition-transform", mobileOpen && "translate-y-1.5 rotate-45")} />
        <span className={cn("h-0.5 w-4 bg-current transition-opacity", mobileOpen && "opacity-0")} />
        <span className={cn("h-0.5 w-4 bg-current transition-transform", mobileOpen && "-translate-y-1.5 -rotate-45")} />
      </button>

      {/* Auth area */}
      {session ? (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-brand-muted transition-colors text-sm"
          >
            <span className="w-6 h-6 rounded-full bg-brand-accent/20 border border-brand-accent/30
                             flex items-center justify-center text-xs font-bold text-brand-accent uppercase">
              {session.user.name?.[0] ?? "?"}
            </span>
            <span className="text-brand-text hidden sm:block">{session.user.name}</span>
            <span className="text-brand-dim text-xs">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-xl z-50 py-1">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-muted">
                Dashboard
              </Link>
              <Link href="/profile/edit" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-muted">
                Edit Profile
              </Link>
              <Link href="/challenges" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-muted">
                Challenges
              </Link>
              <Link href="/notifications" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-muted">
                Notifications
              </Link>
              <hr className="my-1 border-brand-border" />
              <button
                onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-brand-muted"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/login" className="bl-btn bl-btn-ghost bl-btn-sm text-sm">Sign In</Link>
          <Link href="/register" className="bl-btn bl-btn-primary bl-btn-sm text-sm">Join</Link>
        </div>
      )}
      </div>

      {mobileOpen && (
        <div className="border-t border-brand-border bg-[#080a0f] px-3 pb-4 pt-3 shadow-2xl lg:hidden">
          <form onSubmit={handleSearch} className="mb-3 flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar jugadores y equipos" placeholder="Buscar jugadores, equipos…" className="bl-input h-10 flex-1" />
            <button type="submit" className="bl-btn bl-btn-secondary">Buscar</button>
          </form>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {links.map(({ href, label }) => <Link key={href} href={href} className={navClass(href)}>{label}</Link>)}
            {isStaff && <Link href="/admin" className={navClass("/admin")}>Admin</Link>}
            <Link href="/apply" className={navClass("/apply")}>Apply to Bloodline</Link>
            {session && <Link href="/achievements" className={navClass("/achievements")}>Logros</Link>}
          </div>
          {!session && <div className="mt-3 flex gap-2"><Link href="/login" className="bl-btn bl-btn-secondary flex-1">Iniciar sesión</Link><Link href="/register" className="bl-btn bl-btn-primary flex-1">Crear cuenta</Link></div>}
        </div>
      )}
    </nav>
  );
}
