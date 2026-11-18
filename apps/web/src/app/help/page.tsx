import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help center" };

export default function HelpPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Help center</h1>
      <p className="mt-2">The public, server-rendered help center. Not built yet.</p>
    </main>
  );
}
