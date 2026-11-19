import type { NextConfig } from "next";

/** Headers for every page. Vercel adds HSTS on its own domains. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@helpwren/design-system"],
  headers: () => Promise.resolve([{ source: "/:path*", headers: securityHeaders }]),
};

export default nextConfig;
