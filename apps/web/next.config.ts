import type { NextConfig } from "next";

import { BASE_HEADERS } from "./src/lib/security-headers";

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
  // The same on every response. The Content-Security-Policy, which depends on the install's
  // settings, is set per page by the proxy (src/proxy.ts).
  headers: () => Promise.resolve([{ source: "/:path*", headers: [...BASE_HEADERS] }]),
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
