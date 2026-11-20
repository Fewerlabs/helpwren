/**
 * Where the Helpwren install is: the address its widget script, chat and help center are served
 * from. Glown's would be `https://support.glown.io`.
 */
export const HELPWREN_URL = (
  process.env.NEXT_PUBLIC_HELPWREN_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** The public site and the web app are two hostnames of one site, told apart by their first label. */
export type Surface = "site" | "app";

/** Which part of the product a request's `Host` header asks for. */
export function surfaceOf(host: string): Surface {
  return host.startsWith("app.") ? "app" : "site";
}

/**
 * The address of the other part of the product, on the same port: `www.glown.localhost:4300`
 * becomes `app.glown.localhost:4300`, and the other way round.
 */
export function addressOf(surface: Surface, host: string): string {
  const domain = host.replace(/^(www|app)\./, "");
  return `http://${surface === "app" ? "app" : "www"}.${domain}`;
}
