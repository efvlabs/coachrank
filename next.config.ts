import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF rendering traces a file inside public. Include the complete asset directory:
  // older App Hosting adapters skip copying public when tracing already created it.
  async headers() {
    return ["/my-tools", "/sign-in", "/tools/brand-clarity/assessment", "/tools/brand-clarity/access"].map(source => ({ source, headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] }));
  },
  outputFileTracingIncludes: { "/api/assessment/report": ["./public/**/*"] },
};

export default nextConfig;
