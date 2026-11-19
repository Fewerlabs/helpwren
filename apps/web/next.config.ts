import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bottom right, clear of the dashboard's sidebar. Development only.
  devIndicators: { position: "bottom-right" },
  transpilePackages: [
    "@helpwren/adapters",
    "@helpwren/core",
    "@helpwren/design-system",
    "helpwren",
  ],
  // The team's screens moved under /dashboard. Old addresses still work.
  redirects: () => [
    { source: "/inbox", destination: "/dashboard/inbox", permanent: true },
    { source: "/inbox/login", destination: "/login", permanent: true },
  ],
  // The icon route reads Phosphor's SVG files from disk, so a deployment has to carry them.
  outputFileTracingIncludes: {
    "/api/icons/**": ["./node_modules/@phosphor-icons/core/assets/**/*.svg"],
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
