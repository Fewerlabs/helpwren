import type { Metadata } from "next";

export const metadata: Metadata = { title: "New article" };

/** The editor itself is drawn by the layout, so it survives this article taking its address. */
export default function NewArticlePage() {
  return null;
}
