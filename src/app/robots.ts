import type { MetadataRoute } from "next";

import { SITE, absoluteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /go is a redirector and /success is per-payment; neither should be indexed.
        disallow: ["/admin", "/api/", "/go/", "/success", "/my-tools", "/sign-in", "/tools/brand-clarity/assessment", "/tools/brand-clarity/access"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
