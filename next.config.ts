import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/api/assessment/report": ["./public/brand/wordmark.png"] },
};

export default nextConfig;
