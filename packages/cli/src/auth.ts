import { applyAuthSettings, authSettings } from "./auth-config.ts";
import { InstallError, type Context } from "./context.ts";
import { projectRefFromUrl } from "./database.ts";
import { parseEnv, readEnvFile } from "./env-file.ts";

export interface AuthOptions {
  supabaseUrl?: string;
  appUrl?: string;
  accessToken?: string;
}

const TOKENS_PAGE = "https://supabase.com/dashboard/account/tokens";

/**
 * `pnpm helpwren auth`: sets the Supabase Auth settings Helpwren needs on a hosted project, at
 * any time after installing. The sign-in email that shows the code, anonymous sign-ins for the
 * chat, and the Site URL. The project and the app's address come from the env file the
 * installer wrote, unless given. The access token is asked for hidden and never saved.
 */
export async function auth(ctx: Context, options: AuthOptions): Promise<void> {
  const saved = parseEnv(readEnvFile(ctx.paths.webEnv));
  const supabaseUrl =
    options.supabaseUrl ??
    (await ctx.prompt.text("Supabase project URL (https://<ref>.supabase.co)", {
      fallback: saved.get("NEXT_PUBLIC_SUPABASE_URL") ?? "",
    }));
  const projectRef = projectRefFromUrl(supabaseUrl);
  if (!projectRef) {
    throw new InstallError(
      `${supabaseUrl} is not a hosted Supabase project. A local or self-hosted Supabase takes these settings from supabase/config.toml or its own .env.`,
    );
  }
  const appUrl =
    options.appUrl ??
    (await ctx.prompt.text("Where Helpwren is reached (https://support.example.com)", {
      fallback: saved.get("NEXT_PUBLIC_APP_URL") ?? "",
    }));
  const accessToken =
    options.accessToken ??
    (await ctx.prompt.text(`Supabase access token, from ${TOKENS_PAGE}`, { secret: true }));

  ctx.out.step("Supabase Auth settings");
  const problem = await applyAuthSettings(
    ctx.fetch,
    projectRef,
    accessToken,
    authSettings(ctx.paths.root, appUrl),
  );
  if (problem) {
    throw new InstallError(
      `Could not change the Auth settings. ${problem} Check the token can manage this project.`,
    );
  }
  ctx.out.ok("Sign-in codes in the email, anonymous sign-ins on, Site URL set");
}
