import {
  CHANNEL,
  isFrameMessage,
  type FrameMessage,
  type PageContext,
  type PageMessage,
} from "helpwren/protocol";

/** The chat's own page, which the web view loads. `source` is one of the install's sources. */
export function embedUrl(baseUrl: string, source: string): string {
  const url = new URL("/embed", baseUrl);
  url.searchParams.set("source", source);
  return url.href;
}

/**
 * Whether an address is on the install. Only those load in the web view, and only the install's
 * own pages are listened to; anything else opens in the system browser.
 */
export function isOnInstall(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

/**
 * The script that hands the chat a message: it dispatches a message event in the page, which
 * is how the chat hears its app. The message is written as JSON, so nothing in it can run.
 */
export function deliveryScript(message: PageMessage): string {
  // `</script>` and line separators are escaped too, so the JSON is safe wherever it lands.
  const json = JSON.stringify(message)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.dispatchEvent(new MessageEvent("message", { data: ${json} })); true;`;
}

/** A message from the chat, if the text is one; `null` for anything else. */
export function readFrameMessage(text: string): FrameMessage | null {
  try {
    const data: unknown = JSON.parse(text);
    return isFrameMessage(data) ? data : null;
  } catch {
    return null;
  }
}

/** What the app tells the chat once it is ready, in the order it should hear it. */
export function greeting(options: {
  closable: boolean;
  identified: boolean;
  context: PageContext | undefined;
  conversationId: string | undefined;
}): PageMessage[] {
  const messages: PageMessage[] = [
    {
      channel: CHANNEL,
      type: "hello",
      closable: options.closable,
      identified: options.identified,
    },
  ];
  if (options.context) {
    messages.push({ channel: CHANNEL, type: "context", context: options.context });
  }
  if (options.conversationId) {
    messages.push({ channel: CHANNEL, type: "open", conversationId: options.conversationId });
  }
  return messages;
}
