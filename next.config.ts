import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone with a pruned node_modules, so the container
  // image stays small — which is the single biggest lever on cold start.
  output: "standalone",

  // Uploaded photos are served through an authenticated route handler, not
  // through the image optimiser, and sharp on a 1 GiB replica can OOM.
  images: { unoptimized: true },

  // Container Apps sits behind its own proxy; this keeps the response header
  // surface small and predictable.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
