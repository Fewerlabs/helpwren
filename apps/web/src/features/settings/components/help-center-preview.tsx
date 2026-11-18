"use client";

import { type PublicSettings } from "@helpwren/core";
import { Link } from "@helpwren/design-system";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { HelpHomePreview, type PreviewCollection } from "@/features/help-center";
import { useHelpwren } from "@/lib/helpwren-context";

/** Stand-ins, so the preview shows the shape of the page before any collection exists. */
const samples: readonly PreviewCollection[] = [
  {
    name: "Getting started",
    description: "The first steps for a new account.",
    icon: "rocket-launch",
    articleCount: 4,
  },
  {
    name: "Account and billing",
    description: "Plans, invoices and who can sign in.",
    icon: "credit-card",
    articleCount: 6,
  },
  {
    name: "Troubleshooting",
    description: "What to check when something is not working.",
    icon: "wrench",
    articleCount: 3,
  },
];

/** The page is drawn at this size, as on a laptop, and shrunk to fit beside the form. */
const PAGE_WIDTH = 1180;
const PAGE_HEIGHT = 760;

export interface HelpCenterPreviewProps {
  /** The settings to show, saved or not. */
  settings: PublicSettings;
}

/**
 * The help center's home page beside the Branding form, wearing what is in the form before it
 * is saved. It is the real page's own header and footer, drawn small.
 */
export function HelpCenterPreview({ settings }: HelpCenterPreviewProps) {
  const getClient = useHelpwren();
  // The install's own collections, so the preview looks like the page it stands for.
  const collections = useQuery({
    queryKey: ["articles", "collections"],
    queryFn: () => getClient().collections.list(),
  }).data;
  const shown = collections?.length ? collections : samples;

  // How much to shrink the page by follows the room there is for it.
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.34);
  useEffect(() => {
    const element = frame.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / PAGE_WIDTH);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-2xs font-mono tracking-wider uppercase">
          Live preview
        </p>
        <Link href="/help" target="_blank">
          Open the help center
        </Link>
      </div>
      <div
        ref={frame}
        role="region"
        aria-label="Help center preview"
        className="border-rule bg-canvas overflow-hidden rounded-2xl border"
        style={{ height: PAGE_HEIGHT * scale + 28 }}
      >
        {/* The top of a browser window, to say this is a page and not part of the form. */}
        <div
          aria-hidden="true"
          className="border-rule bg-card flex h-7 items-center gap-1.5 border-b px-3"
        >
          <span className="bg-muted size-2 rounded-full" />
          <span className="bg-muted size-2 rounded-full" />
          <span className="bg-muted size-2 rounded-full" />
        </div>
        <div
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <HelpHomePreview settings={settings} collections={shown} />
        </div>
      </div>
    </div>
  );
}
