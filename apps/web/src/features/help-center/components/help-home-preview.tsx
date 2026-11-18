import { type PublicSettings } from "@helpwren/core";
import { ArticleCard } from "@helpwren/design-system";

import { accentStyle } from "@/lib/accent";

import { countArticles } from "../format";
import { iconOf } from "./collection-grid";
import { HelpFooter } from "./help-footer";
import { HelpHeader } from "./help-header";

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
 * beside the Branding form. It is built from the same header and footer as the real page, so
 * the preview cannot drift from it. Nothing in it can be followed or typed into.
 */
export function HelpHomePreview({ settings, collections }: HelpHomePreviewProps) {
  return (
    <div
      inert
      className="bg-background text-foreground flex min-h-full flex-col"
      style={accentStyle(settings.brand)}
    >
      <HelpHeader settings={settings} variant="home" inert />
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <ArticleCard
            key={collection.name}
            href="#"
            icon={iconOf(collection.icon)}
            title={collection.name}
            {...(collection.description ? { summary: collection.description } : {})}
            meta={countArticles(collection.articleCount)}
          />
        ))}
      </div>
      <HelpFooter settings={settings} inert />
    </div>
  );
}
