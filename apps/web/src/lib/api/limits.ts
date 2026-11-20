import { type Limit } from "./rate-limit";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/**
 * Every limit on the routes a visitor can reach, in one place. A network is counted loosely,
 * because an office, a school or a phone network puts many people behind one address; a
 * session, a browser or a conversation is counted tightly, because it is one person. The
 * database keeps its own limits on top of these (see `limit_messages` and
 * `start_conversation`), which also hold for writes that do not come through the app.
 */
export const LIMITS = {
  startPerNetwork: { name: "start:network", limit: 30, windowSeconds: HOUR },
  startPerSession: { name: "start:session", limit: 10, windowSeconds: HOUR },
  checkInPerNetwork: { name: "visit:network", limit: 300, windowSeconds: MINUTE },
  // A chat checks in once a minute and when its page changes. Twenty a minute leaves room for
  // a visitor clicking quickly through a site, and stops a browser stuck in a loop.
  checkInPerVisitor: { name: "visit:browser", limit: 20, windowSeconds: MINUTE },
  outreachPerNetwork: { name: "outreach:network", limit: 60, windowSeconds: MINUTE },
  outreachPerSession: { name: "outreach:session", limit: 10, windowSeconds: MINUTE },
  // Each identify may ask the host product's profile endpoint, so it is kept well below what
  // that endpoint could take.
  identifyPerNetwork: { name: "identify:network", limit: 60, windowSeconds: MINUTE },
  unreadPerNetwork: { name: "unread:network", limit: 120, windowSeconds: MINUTE },
  devicesPerNetwork: { name: "devices:network", limit: 30, windowSeconds: MINUTE },
  uploadPerSession: { name: "upload:session", limit: 30, windowSeconds: 10 * MINUTE },
  uploadPerNetwork: { name: "upload:network", limit: 200, windowSeconds: HOUR },
  feedbackPerNetwork: { name: "feedback:network", limit: 30, windowSeconds: HOUR },
  // One answer per article from one network a day. A second answer is not an error to the
  // reader: it is simply not counted.
  feedbackPerArticle: { name: "feedback:article", limit: 1, windowSeconds: 24 * HOUR },
  // Contextual help: the chat asks once as it opens and when its page changes, and a page may
  // hold a few inline lists. Reads, kept for a minute, so a network is counted loosely.
  articlesPerNetwork: { name: "articles:network", limit: 300, windowSeconds: MINUTE },
  pageHelpPerNetwork: { name: "page-help:network", limit: 120, windowSeconds: MINUTE },
} as const satisfies Record<string, Limit>;
