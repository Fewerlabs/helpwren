"use client";

import { Button, Icon } from "@helpwren/design-system";
import { useSyncExternalStore, useState } from "react";

import { getReaderClient } from "../client";

const key = (articleId: string) => `helpwren:helpful:${articleId}`;

/** Whether this browser has already answered for this article. False on the server. */
function useAnswered(articleId: string): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return window.localStorage.getItem(key(articleId)) !== null;
      } catch {
        return false;
      }
    },
    () => false,
  );
}

/**
 * "Was this helpful?" under an article. One answer per browser: it is remembered there, so the
 * question is not asked again on the next visit.
 */
export function ArticleFeedback({ articleId }: { articleId: string }) {
  const before = useAnswered(articleId);
  const [state, setState] = useState<"asking" | "sending" | "thanked" | "failed">("asking");

  async function answer(helpful: boolean) {
    setState("sending");
    try {
      const result = await getReaderClient().articles.sendFeedback(articleId, helpful);
      if (!result.ok) {
        setState("failed");
        return;
      }
      try {
        window.localStorage.setItem(key(articleId), helpful ? "yes" : "no");
      } catch {
        // Storage is blocked: the answer still counted, it is only not remembered here.
      }
      setState("thanked");
    } catch {
      setState("failed");
    }
  }

  return (
    <section
      aria-label="Feedback"
      className="border-rule bg-card flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border px-5 py-4"
    >
      {before || state === "thanked" ? (
        <p role="status" className="flex items-center gap-2 font-medium">
          <Icon name="check-circle" className="text-primary size-5" />
          Thanks for letting us know.
        </p>
      ) : (
        <>
          <p className="font-medium">
            Was this helpful?
            {state === "failed" ? (
              <span role="alert" className="text-destructive ml-2 text-sm font-normal">
                That did not send. Try again.
              </span>
            ) : null}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={state === "sending"}
              onClick={() => void answer(true)}
            >
              <Icon name="thumbs-up" />
              Yes
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={state === "sending"}
              onClick={() => void answer(false)}
            >
              <Icon name="thumbs-down" />
              No
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
