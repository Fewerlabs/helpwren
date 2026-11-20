import { themeScript } from "@helpwren/design-system";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { OutsideDocs } from "@/components/outside-docs";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/content/site";
import { MotionLayer } from "@/motion/motion-layer";
import { motionScript } from "@/motion/script";

import { fontVariables } from "./fonts";

import "./globals.css";

const title = "Helpwren: open-source live chat, tickets and a help center";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title,
    description: SITE_DESCRIPTION,
    locale: "en",
  },
  twitter: { card: "summary_large_image", title, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The script below may add a class to this element before React starts, which is expected.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body>
        {children}
        <OutsideDocs>
          <MotionLayer />
        </OutsideDocs>
      </body>
    </html>
  );
}
