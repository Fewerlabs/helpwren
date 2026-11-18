"use client";

import { type ConversationWithContact } from "@helpwren/core";
import { cn, Icon, Wren } from "@helpwren/design-system";

import { BrandMark } from "../brand";
import { useShowScreen } from "../store/chat-store";
import { ConversationRow } from "./conversation-row";
import { CloseButton } from "./screen-header";

export interface HomeScreenProps {
  /** The install's own greeting and the line under it, if it has them. */
  greeting: string | undefined;
  intro: string | undefined;
  /** The visitor's most recently active conversation, if they have one. */
  recent: ConversationWithContact | undefined;
  /** Shows a close button that calls this. Given when the chat is in a frame it can close. */
  onClose?: (() => void) | undefined;
}

/** Where the chat opens: a greeting, the way to write, and the visitor's latest conversation. */
export function HomeScreen({ greeting, intro, recent, onClose }: HomeScreenProps) {
  const show = useShowScreen();

  return (
    // A wash of the brand's colour glows from the top corner and fades out with no edge.
    <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(130%_22rem_at_0%_0%,color-mix(in_srgb,var(--brand,var(--primary))_20%,transparent),transparent_72%)] bg-no-repeat">
      <div className="relative px-5 pt-5 pb-2">
        <BrandMark />
        {/* The speech bubbles alone: the wren is our mark, and this screen wears theirs. */}
        <Wren
          scene="conversations"
          decorative
          bird={false}
          className={cn(
            "text-foreground pointer-events-none absolute -top-5 w-32",
            onClose ? "right-12" : "right-3",
          )}
        />
        {onClose ? <CloseButton onClose={onClose} className="absolute top-3 right-3" /> : null}
        <h1 className="mt-10 text-2xl leading-tight font-semibold tracking-tight">
          {greeting ?? "Hi there."}
          <span className="text-muted-foreground block">{intro ?? "How can we help?"}</span>
        </h1>
      </div>

      <div className="px-4 pt-3">
        <button
          type="button"
          className="border-line border-input bg-card hover:bg-muted focus-visible:outline-ring flex h-12 w-full items-center justify-between rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => {
            show({ name: "start" });
          }}
        >
          Send us a message
          <Icon name="caret-right" className="text-muted-foreground" />
        </button>
      </div>

      {recent ? (
        <section aria-labelledby="recent-message" className="px-1 pt-5">
          <h2 id="recent-message" className="text-muted-foreground px-4 pb-1 text-xs">
            Recent message
          </h2>
          <ConversationRow
            conversation={recent}
            onOpen={() => {
              show({ name: "conversation", id: recent.id });
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
