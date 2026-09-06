import type { MetadataRoute } from "next";

import { EDITORIAL_TOPICS } from "@/lib/editorial";

import { CATEGORIES } from "@/lib/categories";
import { BLOG_ENABLED, SITE, absoluteUrl } from "@/lib/config";
import { getPublishedPosts } from "@/lib/domain/blog";
import { getRankedBoard } from "@/lib/domain/listings";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/rankings"), lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: absoluteUrl("/today"), lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: absoluteUrl("/categories"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
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

  const [board, posts] = await Promise.all([
    getRankedBoard(),
    BLOG_ENABLED ? getPublishedPosts(200) : Promise.resolve([]),
  ]);

  const listingRoutes: MetadataRoute.Sitemap = board.map((listing) => ({
    url: absoluteUrl(`/r/${listing.slug}`),
    lastModified: new Date(listing.updatedAtMs || Date.now()),
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.filter(post => !post.noindex).map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedAtMs || Date.now()),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = BLOG_ENABLED
    ? [
        ...postRoutes,
      ]
    : [];

  const editorialRoutes: MetadataRoute.Sitemap = [...EDITORIAL_TOPICS.map(topic => `/topics/${topic.slug}`), "/tools", "/tools/brand-clarity"].map(path => ({ url: absoluteUrl(path), changeFrequency: "weekly", priority: 0.8 }));
  return [...editorialRoutes, ...staticRoutes, ...categoryRoutes, ...listingRoutes, ...blogRoutes];
}
