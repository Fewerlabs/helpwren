import { Button, EmptyState } from "@helpwren/design-system";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

/** Shown for any address that leads nowhere. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        scene="not-found"
        headingLevel={1}
        title="This page does not exist"
        description="The address may be mistyped, or the page may have moved."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Go to the start</Link>
          </Button>
        }
      />
    </main>
  );
}
