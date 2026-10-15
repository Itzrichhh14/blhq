import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://bloodline.gg");

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/players", "/rankings", "/matches", "/tournaments", "/teams", "/seasons", "/news"],
      disallow: ["/admin", "/dashboard", "/profile", "/notifications", "/challenges", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
