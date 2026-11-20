/** A text field of a posted form, trimmed, or `""` when it is missing. */
export function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Sends the browser on to a path of the web app after a form post. Relative, so it stays on
 * the hostname the form was posted to.
 */
export function goTo(path: string): Response {
  return new Response(null, { status: 303, headers: { location: path } });
}
