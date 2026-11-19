import { Button, EmptyState } from "@helpwren/design-system";
import Link from "next/link";

import { HELP_PATH, HelpShell } from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";
import { withEmbed } from "@/lib/help-embed";
import { getHelpEmbed } from "@/lib/help-embed-request";

/** Shown for a collection or an article that does not exist, or is not published. */
export default async function HelpNotFound() {
  const [settings, collections, embed] = await Promise.all([
    getHelpSettings(),
    getHelpCollections(),
    getHelpEmbed(),
  ]);
  return (
    <HelpShell settings={settings} collections={collections} embed={embed}>
      <EmptyState
        scene="not-found"
        bird={false}
        headingLevel={1}
        className="py-10"
        title="This page does not exist"
        description="The article may have moved or been taken down. Try a search, or start from the help center's home."
        action={
          <Button asChild variant="secondary">
            <Link href={withEmbed(HELP_PATH, embed)}>Go to the help center</Link>
          </Button>
        }
      />
    </HelpShell>
  );
}
