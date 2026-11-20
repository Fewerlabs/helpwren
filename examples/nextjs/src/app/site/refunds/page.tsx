import type { Metadata } from "next";

import { SiteWidget } from "../site-widget";

export const metadata: Metadata = { title: "Refunds and cancellations" };

/** The inline block: an element the widget script fills with links to help articles. */
export default function Refunds() {
  return (
    <>
      <h1>Refunds and cancellations</h1>
      <p>Cancel up to a day before and the deposit comes back.</p>
      <section aria-labelledby="refund-help">
        <h2 id="refund-help">Read more</h2>
        <div
          className="helpwren-help"
          data-helpwren-help='{"tags":{"any":["glown-refunds"]},"limit":3}'
        />
      </section>
      <p className="muted">
        The list above is a <code>data-helpwren-help</code> block, filled by the widget script. A
        link opens the article in the chat.
      </p>
      <SiteWidget />
    </>
  );
}
