import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://bloodline.gg");
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/rankings`, lastModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/players`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/matches`, lastModified, changeFrequency: "hourly", priority: 0.8 },
    { url: `${siteUrl}/tournaments`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/teams`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/seasons`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/news`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/apply`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
