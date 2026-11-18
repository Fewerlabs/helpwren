import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bottom right, clear of the dashboard's sidebar. Development only.
  devIndicators: { position: "bottom-right" },
  transpilePackages: ["@helpwren/core", "@helpwren/design-system", "helpwren"],
  // The team's screens moved under /dashboard. Old addresses still work.
  redirects: () => [
    { source: "/inbox", destination: "/dashboard/inbox", permanent: true },
    { source: "/inbox/login", destination: "/login", permanent: true },
  ],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
