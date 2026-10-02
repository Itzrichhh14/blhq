/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bloodline brand palette
        brand: {
          bg:     "#0a0a0f",
          surface:"#111118",
          border: "#1e1e2e",
          muted:  "#2a2a3a",
          text:   "#e2e8f0",
          dim:    "#94a3b8",
          accent: "#dc2626",
        },
        // Tier colors (match rankService.ts TIER_DEFINITIONS)
        tier: {
          academy: "#6B7280",
          genin:   "#22C55E",
          chunin:  "#3B82F6",
          jonin:   "#A855F7",
          kage:    "#EF4444",
          legend:  "#F59E0B",
        },
        // Result colors
        win:  "#22C55E",
        loss: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
