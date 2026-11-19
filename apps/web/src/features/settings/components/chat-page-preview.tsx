"use client";

import { type PublicSettings } from "@helpwren/core";

import { ChatPage } from "@/features/chat";

import { PageFrame } from "./page-frame";

export interface ChatPagePreviewProps {
  /** The settings to show, saved or not. */
  settings: PublicSettings;
}

/**
 * The chat page beside the Branding form, wearing what is in the form before it is saved. It is
 * the real page, with the real chat in it as a new visitor first sees it, drawn small.
 */
export function ChatPagePreview({ settings }: ChatPagePreviewProps) {
  return (
    <PageFrame
      label="Chat page preview"
      href="/chat"
      linkLabel="Open the chat page"
      width={880}
      height={860}
    >
      <ChatPage settings={settings} preview chatClassName="h-[36rem]" />
    </PageFrame>
  );
}
