"use client";

import { createWidget, type ArticleFilter, type HelpArticle, type IdentityState } from "helpwren";
import { useEffect, useState } from "react";

import { HELPWREN_URL } from "@/lib/config";

/**
 * The web app's one widget, from the `helpwren` package rather than the script tag: the way a
 * React app that bundles its own code would add it.
 */
const support = createWidget(HELPWREN_URL);

/** Asks the app's own server for the user's access token, refreshed if it has run out. */
async function getToken(): Promise<string> {
  const response = await fetch("/api/auth/token", { cache: "no-store" });
  if (!response.ok) throw new Error("Not logged in.");
  return response.text();
}

/**
 * Adds the widget once for the whole web app, and says who is logged in. `identify` is given a
 * function, not a token, so the widget can fetch a fresh one each time the chat loads and when
 * the install says the one it had has expired.
 */
export function Support({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    support.init({ source: "web_app" });
    return () => {
      support.destroy();
    };
  }, []);
  useEffect(() => {
    if (signedIn) support.identify({ token: getToken });
  }, [signedIn]);
  return null;
}

interface SupportContextProps {
  businessId: string;
  plan: string;
  /** Which screen of the app this is. */
  page: string;
  /**
   * The help articles for this screen. The chat lists them under "Help for this page", in
   * place of whatever the install's rules say. Leave it out to let the rules decide.
   */
  filter?: ArticleFilter;
}

/**
 * What the team sees under "From the page" for a conversation started on this screen, and the
 * filter that picks this screen's help articles, if it has one.
 */
export function SupportContext({ businessId, plan, page, filter }: SupportContextProps) {
  // Compared by what it says, so a filter written inline is not sent again on every render.
  const filterJson = filter === undefined ? undefined : JSON.stringify(filter);
  useEffect(() => {
    support.setContext({
      businessId,
      plan,
      page,
      ...(filterJson === undefined ? {} : { filter: JSON.parse(filterJson) as ArticleFilter }),
    });
  }, [businessId, plan, page, filterJson]);
  return null;
}

/**
 * Help articles in the app's own design, from `findArticles`: the install's public endpoint,
 * which answers only the allowed domains. A click opens the article in the chat.
 */
export function HelpLinks({ filter, label }: { filter: ArticleFilter; label: string }) {
  const [articles, setArticles] = useState<HelpArticle[] | null>(null);
  const filterJson = JSON.stringify(filter);
  useEffect(() => {
    let current = true;
    support
      .findArticles(JSON.parse(filterJson) as ArticleFilter)
      .then((found) => {
        if (current) setArticles(found);
      })
      .catch(() => {
        if (current) setArticles([]);
      });
    return () => {
      current = false;
    };
  }, [filterJson]);
  if (!articles || articles.length === 0) return null;
  return (
    <nav aria-label={label} className="help-links">
      <h2>{label}</h2>
      <ul>
        {articles.map((article) => (
          <li key={article.slug}>
            <button
              type="button"
              onClick={() => {
                support.openArticle(article.slug);
              }}
            >
              {article.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The header's Help button, with the number of unread replies beside it. */
export function HelpButton() {
  const [unread, setUnread] = useState(0);
  useEffect(() => support.on("unread", setUnread), []);
  return (
    <button
      type="button"
      onClick={() => {
        support.show();
      }}
    >
      Help
      {unread > 0 ? (
        <span className="badge" aria-label={`${unread} unread`}>
          {unread}
        </span>
      ) : null}
    </button>
  );
}

const STATES: Record<IdentityState["state"], string> = {
  user: "Support knows it is you.",
  guest: "Support sees a guest.",
  failed: "Support could not confirm who you are",
};

/** What the widget last said about who the chat is signed in as. */
export function SupportStatus() {
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  useEffect(() => support.on("identity", setIdentity), []);
  if (!identity) return null;
  return (
    <p role="status" aria-label="Support sign-in" className="muted">
      {STATES[identity.state]}
      {identity.state === "failed" ? ` (${identity.reason}).` : null}
    </p>
  );
}

/**
 * Logs out of the app. The widget is told first, with `reset()`, and the form is sent once the
 * chat says it has forgotten them (or after a second), so the next person gets a guest's chat.
 */
export function LogoutButton() {
  return (
    <form
      action="/api/auth/logout"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const send = () => {
          stop();
          clearTimeout(timer);
          form.submit();
        };
        const stop = support.on("identity", send);
        const timer = setTimeout(send, 1000);
        support.reset();
      }}
    >
      <button type="submit">Log out</button>
    </form>
  );
}
