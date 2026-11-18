"use client";

import { Button, EmptyState } from "@helpwren/design-system";

/** Shown when a page fails while it is being drawn. `reset` draws it again. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        role="alert"
        scene="error"
        headingLevel={1}
        title="Something went wrong"
        description="This page could not be shown. Trying again often helps."
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
