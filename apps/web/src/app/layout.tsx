import type { Metadata } from "next";
import type { ReactNode } from "react";

import { themeScript } from "@/lib/theme-script";

import { fontVariables } from "./fonts";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Helpwren", template: "%s · Helpwren" },
  description: "Open-source, self-hosted live chat, help desk and knowledge base.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The script below may add a class to this element before React starts, which is expected.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
