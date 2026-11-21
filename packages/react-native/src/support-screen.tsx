import {
  CHANNEL,
  type ArticleFilter,
  type IdentityState,
  type PageContext,
  type PageMessage,
} from "helpwren/protocol";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Linking, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
} from "react-native-webview/lib/WebViewTypes";

import {
  contextMessage,
  deliveryScript,
  embedUrl,
  greeting,
  isOnInstall,
  readFrameMessage,
} from "./bridge";

// The library's class defaults its extra props to `undefined`, which leaves it no props at all
// in strict TypeScript. Naming them as none fixes that.
const ChatView = WebView<object>;

/** The user's token for your product: a string, or a function that fetches a fresh one. */
export type TokenSource = string | (() => string | Promise<string>);

export interface SupportScreenProps {
  /** Where the Helpwren install is, such as `https://support.example.com`. */
  baseUrl: string;
  /** Which of the install's sources this app is, such as `customer_app`. */
  source: string;
  /**
   * The logged-in user's token, checked by the install as its Identity settings say. Leave it
   * out for someone who is not logged in: they chat as a guest. A function is called again
   * once when a token has expired.
   */
  token?: TokenSource;
  /** What your team should know about where the person is: app version, screen, order. */
  context?: PageContext;
  /**
   * Which help articles fit the screen, such as `{ tags: { any: ["refunds"] } }`. The chat's
   * home leads with them under "Help for this page", in place of the team's rules.
   */
  filter?: ArticleFilter;
  /** Opens this conversation, as when the person taps a notification about it. */
  conversationId?: string;
  /** The number of replies the person has not read, whenever it changes. */
  onUnread?: (count: number) => void;
  /** Whether the chat signed in as your user, is a guest, or could not sign in. */
  onIdentity?: (identity: IdentityState) => void;
  /** Shows a close button in the chat, which calls this. Leave it out to hide the button. */
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Helpwren's chat as a screen of your app: the install's own chat page in a web view, told who
 * the user is and what they are looking at. Nothing is passed in the address: the token travels
 * as a message once the chat says it is ready, and only to the install's own page.
 */
export function SupportScreen({
  baseUrl,
  source,
  token,
  context,
  filter,
  conversationId,
  onUnread,
  onIdentity,
  onClose,
  style,
}: SupportScreenProps) {
  const view = useRef<InstanceType<typeof ChatView>>(null);
  const ready = useRef(false);
  const retried = useRef(false);
  // The latest props, for the message handler, which is not remade on every render.
  const latest = useRef({ token, context, filter, conversationId, onUnread, onIdentity, onClose });
  useLayoutEffect(() => {
    latest.current = { token, context, filter, conversationId, onUnread, onIdentity, onClose };
  });

  const deliver = useCallback((message: PageMessage) => {
    view.current?.injectJavaScript(deliveryScript(message));
  }, []);

  const sendIdentity = useCallback(async () => {
    const given = latest.current.token;
    if (given === undefined) return;
    try {
      const value = typeof given === "function" ? await given() : given;
      // The person may have logged out while the token was fetched.
      if (latest.current.token !== undefined) {
        deliver({ channel: CHANNEL, type: "identify", token: value });
      }
    } catch {
      latest.current.onIdentity?.({ state: "failed", reason: "error" });
    }
  }, [deliver]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      // Only the install's own page is listened to, whatever the web view has wandered to.
      if (!isOnInstall(event.nativeEvent.url, baseUrl)) return;
      const message = readFrameMessage(event.nativeEvent.data);
      if (!message) return;
      const props = latest.current;

      if (message.type === "ready") {
        ready.current = true;
        for (const each of greeting({
          closable: props.onClose !== undefined,
          identified: props.token !== undefined,
          context: props.context,
          filter: props.filter,
          conversationId: props.conversationId,
        })) {
          deliver(each);
        }
        void sendIdentity();
      } else if (message.type === "unread") {
        props.onUnread?.(message.count);
      } else if (message.type === "close") {
        props.onClose?.();
      } else if (message.type === "identity") {
        const state: IdentityState =
          message.state === "failed"
            ? { state: "failed", reason: message.reason }
            : { state: message.state };
        const expired = state.state === "failed" && state.reason === "expired";
        if (expired && typeof props.token === "function" && !retried.current) {
          retried.current = true;
          void sendIdentity();
          return;
        }
        if (state.state === "user") retried.current = false;
        props.onIdentity?.(state);
      }
    },
    [baseUrl, deliver, sendIdentity],
  );

  // Logging in or out while the screen is open. A function is the same login however often it
  // is remade, so an inline `token={() => ...}` does not sign in again on every render; give
  // the screen a new `key` to switch to another user.
  const login = token === undefined ? null : typeof token === "function" ? "function" : token;
  const loggedIn = useRef(login !== null);
  useEffect(() => {
    if (!ready.current) return;
    retried.current = false;
    if (login !== null) void sendIdentity();
    else if (loggedIn.current) deliver({ channel: CHANNEL, type: "reset" });
    loggedIn.current = login !== null;
  }, [deliver, login, sendIdentity]);

  // Compared by what it says, so an object made inline is not sent again on every render.
  const contextJson =
    context === undefined && filter === undefined ? null : JSON.stringify({ context, filter });
  useEffect(() => {
    if (!ready.current || contextJson === null) return;
    const sent = JSON.parse(contextJson) as { context?: PageContext; filter?: ArticleFilter };
    deliver(contextMessage(sent.context, sent.filter));
  }, [contextJson, deliver]);

  useEffect(() => {
    if (ready.current && conversationId) {
      deliver({ channel: CHANNEL, type: "open", conversationId });
    }
  }, [conversationId, deliver]);

  const onShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (isOnInstall(request.url, baseUrl)) return true;
      // A link in a message, or an attachment: the person's own browser, not this screen.
      void Linking.openURL(request.url);
      return false;
    },
    [baseUrl],
  );

  return (
    <ChatView
      ref={view}
      style={style}
      source={{ uri: embedUrl(baseUrl, source) }}
      originWhitelist={[new URL(baseUrl).origin]}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      onMessage={onMessage}
      // A reload starts the conversation with the page over again.
      onLoadStart={() => {
        ready.current = false;
      }}
      javaScriptEnabled
      domStorageEnabled
      keyboardDisplayRequiresUserAction={false}
      hideKeyboardAccessoryView
      setSupportMultipleWindows={false}
    />
  );
}
