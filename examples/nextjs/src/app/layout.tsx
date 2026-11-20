import type { Metadata } from "next";
import type { ReactNode } from "react";

import { hasBrand } from "@/lib/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Glown", template: "%s · Glown" },
  description: "A stand-in for Glown, to try Helpwren on a real product.",
  // Glown's own, when its brand files have been copied in.
  ...(hasBrand
    ? {
        icons: {
          icon: [
            { url: "/brand/favicon-32x32.png", sizes: "32x32" },
            { url: "/brand/favicon-16x16.png", sizes: "16x16" },
          ],
          shortcut: "/brand/favicon.ico",
          apple: "/brand/apple-touch-icon.png",
        },
      }
    : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
