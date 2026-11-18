import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <p className="text-muted-foreground mt-2">The agent inbox. Not built yet.</p>
    </main>
  );
}
