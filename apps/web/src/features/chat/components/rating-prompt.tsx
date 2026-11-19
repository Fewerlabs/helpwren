"use client";

import { RATING_MAX } from "@helpwren/core";
import { Button, cn, Textarea } from "@helpwren/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

const scores = Array.from({ length: RATING_MAX }, (_, index) => index + 1);
const words = ["Terrible", "Poor", "Okay", "Good", "Great"];

const ratingKey = (conversationId: string) => ["chat", "rating", conversationId];

/**
 * Asks how a resolved conversation went: a score from 1 to 5 and, if the visitor likes, a few
 * words. Shown once the team has resolved it, and gone for good once it has been rated.
 */
export function RatingPrompt({ conversationId }: { conversationId: string }) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const rating = useQuery({
    queryKey: ratingKey(conversationId),
    queryFn: () => getClient().ratings.get(conversationId),
  });
  const submit = useMutation({
    mutationFn: (chosen: number) => getClient().ratings.submit(conversationId, chosen, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ratingKey(conversationId) }),
  });

  // Nothing to ask until it is known whether they have rated already, or once they have.
  if (rating.data !== null) return null;

  return (
    <form
      aria-label="Rate this conversation"
      className="border-rule bg-muted/40 grid gap-3 border-t px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (score !== null) submit.mutate(score);
      }}
    >
      <p className="text-sm font-medium">How did we do?</p>
      <div role="radiogroup" aria-label="Your rating" className="flex gap-1.5">
        {scores.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={score === value}
            aria-label={`${value} out of ${RATING_MAX}: ${words[value - 1] ?? ""}`}
            className={cn(
              "border-line focus-visible:outline-ring h-10 flex-1 rounded-lg text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              score === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-primary/10",
            )}
            onClick={() => {
              setScore(value);
            }}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{words[0]}</span>
        <span>{words[RATING_MAX - 1]}</span>
      </div>
      {score === null ? null : (
        <>
          <Textarea
            aria-label="Anything to add?"
            placeholder="Anything to add? (optional)"
            rows={2}
            maxLength={1000}
            className="min-h-16 resize-none"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
          />
          {submit.isError || submit.data?.ok === false ? (
            <p role="alert" className="text-destructive text-xs">
              Your rating could not be saved. Try again.
            </p>
          ) : null}
          <Button type="submit" loading={submit.isPending}>
            Send rating
          </Button>
        </>
      )}
    </form>
  );
}
