import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/src/components/layout/AuthProvider";
import { Navbar } from "@/src/components/layout/Navbar";
import { Footer } from "@/src/components/layout/Footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const socialImage = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&h=630&q=85";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Bloodline | Competitive Duels", template: "%s | Bloodline" },
  description: "Compite, escala el ranking y encuentra tu próximo rival. Rankings, duelos y torneos de Bloodline.",
  applicationName: "Bloodline Competitive",
  keywords: ["Bloodline", "competitive duels", "Roblox duels", "rankings", "tournaments", "esports community"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Bloodline Competitive",
    title: "Bloodline | Competitive Duels",
    description: "Compite, escala el ranking y encuentra tu próximo rival.",
    images: [{ url: socialImage, width: 1200, height: 630, alt: "Arena de esports de Bloodline Competitive" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bloodline | Competitive Duels",
    description: "Rankings, duelos y torneos de Bloodline.",
    images: [socialImage],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-bg text-brand-text min-h-screen">
        <AuthProvider>
          <Navbar />
          <div className="pt-14">
            {children}
          </div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
