import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF rendering traces a file inside public. Include the complete asset directory:
  // older App Hosting adapters skip copying public when tracing already created it.
  outputFileTracingIncludes: { "/api/assessment/report": ["./public/**/*"] },
};

export default nextConfig;
