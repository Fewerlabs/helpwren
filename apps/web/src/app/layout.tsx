import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fontVariables } from "./fonts";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Helpwren", template: "%s · Helpwren" },
  description: "Open-source, self-hosted live chat, help desk and knowledge base.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
