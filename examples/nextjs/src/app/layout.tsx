import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HelpwrenScript } from "./helpwren-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helpwren example: Next.js",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <HelpwrenScript />
      </body>
    </html>
  );
}
