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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      setQ("");
    }
  }

  const isStaff = session?.user.role && ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-brand-surface/95 backdrop-blur-sm border-b border-brand-border flex items-center px-4 gap-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
        <span className="text-brand-accent font-black text-lg tracking-widest uppercase">
          BLOODLINE
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-1 text-sm">
        {[
          { href: "/rankings", label: "Rankings" },
          { href: "/players",  label: "Players"  },
          { href: "/matches",  label: "Matches"  },
          { href: "/tournaments", label: "Tournaments" },
          { href: "/seasons",  label: "Seasons"  },
          { href: "/teams",    label: "Teams"    },
          { href: "/news",     label: "News"     },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 rounded text-sm transition-colors",
              pathname.startsWith(href)
                ? "text-brand-text bg-brand-muted"
                : "text-brand-dim hover:text-brand-text hover:bg-brand-muted/50"
            )}
          >
            {label}
          </Link>
        ))}
        {isStaff && (
          <Link
            href="/admin"
            className={cn(
              "px-3 py-1.5 rounded text-sm transition-colors text-brand-accent/80 hover:text-brand-accent hover:bg-brand-muted/50",
              pathname.startsWith("/admin") && "bg-brand-muted"
            )}
          >
            Admin
          </Link>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xs ml-auto">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search players, teams…"
          className="w-full h-8 px-3 text-sm bg-brand-bg border border-brand-border rounded
                     text-brand-text placeholder-brand-dim/60 focus:outline-none focus:border-brand-accent/50"
        />
      </form>

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
    </nav>
  );
}
