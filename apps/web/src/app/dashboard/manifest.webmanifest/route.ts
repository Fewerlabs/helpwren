import { buildManifest } from "@/features/pwa";
import { installSettings } from "@/lib/api/install-settings";

// The brand's name can change at any time, so the manifest is made on each request.
export const dynamic = "force-dynamic";

/**
 * The dashboard's web app manifest. A route under /dashboard rather than `app/manifest.ts`,
 * which Next.js would link from every page: the help center and the chat page must not offer
 * to install the team's app. Public, like the brand it names; the dashboard's own pages check
 * who is signed in.
 */
export async function GET(): Promise<Response> {
  const settings = await installSettings();
  return Response.json(buildManifest(settings.brand.name), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
