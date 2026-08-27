import type { MetadataRoute } from "next";

import { SITE, absoluteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /go is a redirector and /success is per-payment; neither should be indexed.
        disallow: ["/admin", "/api/", "/go/", "/success"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
