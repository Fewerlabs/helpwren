import { type PublicSettings } from "@helpwren/core";
import { cn } from "@helpwren/design-system";

import { brandProps } from "@/lib/accent";

import { CollectionGrid } from "./collection-grid";
import { HelpHero } from "./help-hero";
import { HelpShell } from "./help-shell";

export interface PreviewCollection {
  name: string;
  description: string | null;
  icon: string;
  articleCount: number;
}

export interface HelpHomePreviewProps {
  /** The settings to show, saved or not. */
  settings: PublicSettings;
  collections: readonly PreviewCollection[];
}

/**
 * The help center's home page, drawn from settings that may not be saved yet, for the preview
 * beside the Branding form. It is the real page's own frame, greeting and cards, so the
 * preview cannot drift from it. Nothing in it can be followed or typed into.
 */
export function HelpHomePreview({ settings, collections }: HelpHomePreviewProps) {
  // The preview has the names and counts, not the articles themselves, so each collection
  // gets as many stand-ins as it has articles.
  const shown = collections.map((collection, index) => ({
    id: `preview-${index}`,
    slug: `preview-${index}`,
    name: collection.name,
    description: collection.description,
    icon: collection.icon,
    articles: Array.from({ length: collection.articleCount }, (_, at) => ({
      id: `preview-${index}-${at}`,
      slug: `preview-${index}-${at}`,
      title: at === 0 ? "A first article" : at === 1 ? "Another article" : "One more article",
    })),
  }));

  return (
    <div
      className={cn(
        "bg-card text-foreground relative isolate flex min-h-full flex-col overflow-hidden",
      )}
      {...brandProps(settings.brand)}
    >
      <HelpShell settings={settings} collections={shown} home inert>
        <HelpHero settings={settings} />
        <div className="mt-10">
          <CollectionGrid collections={shown} />
        </div>
      </HelpShell>
    </div>
  );
}
