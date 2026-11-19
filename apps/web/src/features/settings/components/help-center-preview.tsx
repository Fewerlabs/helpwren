"use client";

import { type PublicSettings } from "@helpwren/core";
import { useQuery } from "@tanstack/react-query";

import { HelpHomePreview, type PreviewCollection } from "@/features/help-center";
import { useHelpwren } from "@/lib/helpwren-context";

import { PageFrame } from "./page-frame";

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

  return (
    <PageFrame
      label="Help center preview"
      href="/help"
      linkLabel="Open the help center"
      width={1180}
      height={760}
    >
      <HelpHomePreview settings={settings} collections={shown} />
    </PageFrame>
  );
}
