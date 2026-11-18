import { Button, EmptyState } from "@helpwren/design-system";
import Link from "next/link";

import { HELP_PATH, HelpHeader } from "@/features/help-center";
import { getHelpSettings } from "@/lib/help-center-data";

/** Shown for a collection or an article that does not exist, or is not published. */
export default async function HelpNotFound() {
  const settings = await getHelpSettings();
  return (
    <>
      <HelpHeader settings={settings} variant="inner" />
      <main className="grid flex-1 place-items-center p-6">
        <EmptyState
          scene="not-found"
          bird={false}
          headingLevel={1}
          title="This page does not exist"
          description="The article may have moved or been taken down. Try a search, or start from the help center's home."
          action={
            <Button asChild variant="secondary">
              <Link href={HELP_PATH}>Go to the help center</Link>
            </Button>
          }
        />
      </main>
    </>
  );
}
