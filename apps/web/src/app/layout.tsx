import { themeScript } from "@helpwren/design-system";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fontVariables } from "./fonts";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Helpwren", template: "%s · Helpwren" },
  description: "Open-source, self-hosted live chat, help desk and knowledge base.",
};

/**
 * The team's screens, the help center and the chat page follow the theme chosen with their theme
 * buttons, or the device's until one is chosen. The chat in the widget's frame is left alone: it
 * sits inside someone else's page.
 */
const script = themeScript({ paths: ["/dashboard", "/help", "/login", "/chat"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The script below may add a class to this element before React starts, which is expected.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: script }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
