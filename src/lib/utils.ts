// ============================================================
// Shared frontend utilities
// ============================================================

/** Merge class names (lightweight cn()) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a date to a readable string */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

/** Format date + time */
export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** "3 days ago" style */
export function fmtRelative(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

/** Format a rating delta with +/- sign */
export function fmtDelta(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Win-rate as a percentage string */
export function fmtWinRate(wins: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

/** Streak display: +5 or -3 */
export function fmtStreak(streak: number): string {
  if (streak === 0) return "0";
  return streak > 0 ? `+${streak}` : `${streak}`;
}

/** Tier to color hex (matches TIER_DEFINITIONS in rankService) */
const TIER_COLORS: Record<string, string> = {
  ACADEMY:          "#6B7280",
  GENIN:            "#22C55E",
  CHUNIN:           "#3B82F6",
  JONIN:            "#A855F7",
  KAGE:             "#EF4444",
  BLOODLINE_LEGEND: "#F59E0B",
};

export function tierColor(tier: string): string {
  return TIER_COLORS[tier] ?? "#6B7280";
}

/** Tier to human display name */
const TIER_NAMES: Record<string, string> = {
  ACADEMY:          "Academy",
  GENIN:            "Genin",
  CHUNIN:           "Chūnin",
  JONIN:            "Jōnin",
  KAGE:             "Kage",
  BLOODLINE_LEGEND: "Bloodline Legend",
};

export function tierName(tier: string): string {
  return TIER_NAMES[tier] ?? tier;
}

/** Tier to Tailwind text color class */
export function tierTextClass(tier: string): string {
  const map: Record<string, string> = {
    ACADEMY:          "text-gray-400",
    GENIN:            "text-green-400",
    CHUNIN:           "text-blue-400",
    JONIN:            "text-purple-400",
    KAGE:             "text-red-400",
    BLOODLINE_LEGEND: "text-amber-400",
  };
  return map[tier] ?? "text-gray-400";
}

/** RankMovement arrow */
export function movementIcon(m: string): string {
  if (m === "UP") return "↑";
  if (m === "DOWN") return "↓";
  if (m === "NEW") return "★";
  return "—";
}

export function movementClass(m: string): string {
  if (m === "UP") return "text-green-400";
  if (m === "DOWN") return "text-red-400";
  if (m === "NEW") return "text-amber-400";
  return "text-brand-dim";
}

/** ChallengeStatus badge colors */
export function challengeStatusClass(s: string): string {
  const map: Record<string, string> = {
    PENDING:   "bg-amber-900/50 text-amber-300",
    ACCEPTED:  "bg-blue-900/50 text-blue-300",
    DECLINED:  "bg-red-900/50 text-red-300",
    EXPIRED:   "bg-gray-800 text-gray-500",
    COMPLETED: "bg-green-900/50 text-green-300",
    CANCELLED: "bg-gray-800 text-gray-500",
  };
  return map[s] ?? "bg-gray-800 text-gray-400";
}

/** Tournament status badge */
export function tournamentStatusClass(s: string): string {
  const map: Record<string, string> = {
    REGISTRATION: "bg-blue-900/50 text-blue-300",
    UPCOMING:     "bg-amber-900/50 text-amber-300",
    LIVE:         "bg-green-900/50 text-green-300",
    COMPLETED:    "bg-gray-800 text-gray-400",
    CANCELLED:    "bg-red-900/50 text-red-300",
  };
  return map[s] ?? "bg-gray-800 text-gray-400";
}

/** Match status badge */
export function matchStatusClass(s: string): string {
  const map: Record<string, string> = {
    SCHEDULED:  "bg-blue-900/50 text-blue-300",
    LIVE:       "bg-green-900/50 text-green-300",
    COMPLETED:  "bg-gray-800 text-gray-400",
    CANCELLED:  "bg-red-900/50 text-red-300",
  };
  return map[s] ?? "bg-gray-800 text-gray-400";
}

/** Rarity badge */
export function rarityClass(r: string): string {
  const map: Record<string, string> = {
    COMMON:    "bg-gray-800 text-gray-300",
    RARE:      "bg-blue-900/50 text-blue-300",
    EPIC:      "bg-purple-900/50 text-purple-300",
    LEGENDARY: "bg-amber-900/50 text-amber-300",
    MYTHIC:    "bg-red-900/50 text-red-300",
  };
  return map[r] ?? "bg-gray-800 text-gray-300";
}

/** Application status badge */
export function appStatusClass(s: string): string {
  const map: Record<string, string> = {
    PENDING:      "bg-amber-900/50 text-amber-300",
    UNDER_REVIEW: "bg-blue-900/50 text-blue-300",
    TRIAL:        "bg-purple-900/50 text-purple-300",
    ACCEPTED:     "bg-green-900/50 text-green-300",
    DECLINED:     "bg-red-900/50 text-red-300",
  };
  return map[s] ?? "bg-gray-800 text-gray-400";
}

/** Truncate long text */
export function truncate(s: string, n = 60): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Generic API fetch helper (client-side) */
export async function apiFetch<T>(
  path: string,
  opts?: RequestInit
): Promise<{ data: T } | { error: { code: string; message: string } }> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  const json = await res.json();
  if (!json.success) return { error: json.error };
  return { data: json.data as T };
}
