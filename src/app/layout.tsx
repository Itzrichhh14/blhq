import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/src/components/layout/AuthProvider";
import { Navbar } from "@/src/components/layout/Navbar";

export const metadata: Metadata = {
  title: { default: "BLOODLINE", template: "%s | BLOODLINE" },
  description: "Competitive Roblox gaming organization — Timebomb Duels",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-bg text-brand-text min-h-screen">
        <AuthProvider>
          <Navbar />
          {/* Push content below the fixed navbar */}
          <div className="pt-14">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
