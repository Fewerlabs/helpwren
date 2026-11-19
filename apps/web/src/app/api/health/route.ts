import { buildInfo } from "@/lib/build-info";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Asked by load balancers and Docker every few seconds, so it is never built ahead or cached.
export const dynamic = "force-dynamic";

/**
 * Whether this install is up: the app answers, the database answers, and how far its
 * migrations have gone against what this build expects. Public, so it says nothing secret:
 * no addresses, keys or counts. 503 when the database cannot be reached.
 */
export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin.rpc("schema_version");
  const database = error ? "unreachable" : "ok";
  const schemaVersion = error ? null : data;
  const migrations =
    schemaVersion === null || buildInfo.schemaVersion === null
      ? "unknown"
      : schemaVersion >= buildInfo.schemaVersion
        ? "current"
        : "pending";

  return Response.json(
    {
      status: error ? "error" : "ok",
      version: buildInfo.version,
      database,
      schemaVersion,
      expectedSchemaVersion: buildInfo.schemaVersion,
      migrations,
    },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
