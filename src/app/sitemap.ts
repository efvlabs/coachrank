import type { MetadataRoute } from "next";

import { CATEGORIES } from "@/lib/categories";
import { BLOG_ENABLED, SITE, absoluteUrl } from "@/lib/config";
import { getPublishedPosts } from "@/lib/domain/blog";
import { getListedCoaches, getRankedBoard } from "@/lib/domain/listings";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/today"), lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: absoluteUrl("/categories"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/enroll"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/rules"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.flatMap((c) => [
    {
      url: absoluteUrl(`/coaches/${c.slug}`),
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    {
      url: absoluteUrl(`/coaches/${c.slug}/today`),
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.5,
    },
  ]);

  const [board, listed, posts] = await Promise.all([
    getRankedBoard(),
    getListedCoaches(),
    BLOG_ENABLED ? getPublishedPosts(200) : Promise.resolve([]),
  ]);

  // Every coach with a page belongs here, ranked or not - a listed coach's page is the
  // main thing we offered them, and it is worth nothing unindexed.
  const listingRoutes: MetadataRoute.Sitemap = [...board, ...listed].map((listing) => ({
    url: absoluteUrl(`/r/${listing.slug}`),
    lastModified: new Date(listing.updatedAtMs || Date.now()),
    changeFrequency: listing.status === "active" ? "daily" : "weekly",
    priority: listing.status === "active" ? 0.6 : 0.5,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedAtMs || Date.now()),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = BLOG_ENABLED
    ? [
        { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
        ...postRoutes,
      ]
    : [];

  return [...staticRoutes, ...categoryRoutes, ...listingRoutes, ...blogRoutes];
}
