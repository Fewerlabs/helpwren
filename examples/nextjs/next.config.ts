import type { NextConfig } from "next";

import { HELPWREN_URL } from "./src/lib/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["helpwren"],
  // The dev server only serves its scripts to the hostnames it is told about: Glown's two,
  // and 127.0.0.1, which the specs use as a site the install does not allow.
  allowedDevOrigins: ["*.glown.localhost", "127.0.0.1"],
  // The help center is served by the install and appears at /help on this site, as section 4.6
  // of Helpwren's build plan sets out for glown.io. The install's help center address setting
  // points at this site's /help, so its links, canonical URLs and sitemap use it.
  rewrites: () =>
    Promise.resolve([{ source: "/help/:path*", destination: `${HELPWREN_URL}/help/:path*` }]),
};

export default nextConfig;
