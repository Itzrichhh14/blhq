"use client";
import { tierColor, tierName } from "@/src/lib/utils";

interface TierBadgeProps {
  tier: string;
  size?: "sm" | "md" | "lg";
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const color = tierColor(tier);
  const name = tierName(tier);
  const sizeClass = size === "sm"
    ? "text-[10px] px-1.5 py-0.5"
    : size === "lg"
    ? "text-sm px-3 py-1"
    : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded font-bold uppercase tracking-wide ${sizeClass}`}
      style={{ color, border: `1px solid ${color}30`, backgroundColor: `${color}18` }}
    >
      {name}
    </span>
  );
}
