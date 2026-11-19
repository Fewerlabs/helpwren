/** A YouTube video's id: eleven letters, digits, dashes or underscores. */
const ID = /^[\w-]{11}$/;

/**
 * The id of the YouTube video an address points to, from a watch page, a short `youtu.be`
 * link, an embed or a Short, or an id on its own. Anything else gives `undefined`, so only a
 * YouTube video is ever put in a frame.
 */
export function youtubeId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const input = value.trim();
  if (ID.test(input)) return input;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return undefined;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : /^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1];
  }
  return id && ID.test(id) ? id : undefined;
}

/**
 * Where a YouTube video plays inside a page: YouTube's privacy-enhanced player, which sets no
 * cookies until the video is played.
 */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
