import { MarginNote } from "@helpwren/design-system";

import { Capture } from "@/components/capture";
import { LazyOpenChatButton } from "@/components/deferred";
import { Entry, HandLabel, Taped } from "@/components/journal";
import { DEMO_URL } from "@/content/demo";

import { WildMotion } from "./motion";
import { WildPerch } from "./wild-perch";

/**
 * Entry 05: the widget as a visitor meets it. Every picture is a capture of the running product;
 * with a demo install set, the real widget is on the page too, and this entry opens it.
 */
export function Wild() {
  return (
    <Entry
      motion={<WildMotion />}
      id="wild"
      number="05"
      subject="Observed in the wild"
      note={DEMO_URL ? "The real widget, live" : "Captured from the running app"}
      title="What your visitors see"
      flip
      sketch={
        <Taped className="w-full max-w-sm">
          <div className="@container relative">
            <Capture
              name="widget"
              sizes="(min-width: 1024px) 384px, 90vw"
              className="border-rule overflow-hidden rounded-[1.25rem] border"
            />
            {/* The wren stands on the launcher in the capture. */}
            <WildPerch />
            <MarginNote
              arrow="down-right"
              className="absolute top-[30%] -left-2 hidden w-32 -translate-x-full text-lg xl:flex"
            >
              suggested before they ask
            </MarginNote>
          </div>
        </Taped>
      }
      after={
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <figure>
            <Taped>
              <Capture
                name="inbox"
                sizes="(min-width: 768px) 560px, 92vw"
                className="border-rule overflow-hidden rounded-xl border"
              />
            </Taped>
            <figcaption className="mt-3 text-center">
              <HandLabel>fig. 5a: the team&apos;s inbox, where the message lands</HandLabel>
            </figcaption>
          </figure>
          <figure>
            <Taped>
              <Capture
                name="help"
                sizes="(min-width: 768px) 560px, 92vw"
                className="border-rule overflow-hidden rounded-xl border"
              />
            </Taped>
            <figcaption className="mt-3 text-center">
              <HandLabel>fig. 5b: your help center, on your own address</HandLabel>
            </figcaption>
          </figure>
        </div>
      }
    >
      <p>
        A launcher in the corner opens the chat. Before writing, visitors see the articles your team
        put forward, and can open them right there. They can send a message or submit a ticket.
      </p>
      <p>
        Logged-out visitors chat as guests. People you identify are recognised, and the team sees
        the page they wrote from.
      </p>
      {DEMO_URL ? (
        <div className="space-y-2 pt-2">
          <LazyOpenChatButton />
          <p className="text-sm">
            This is a demo install of Helpwren. Messages go to it, and may not get an answer.
          </p>
        </div>
      ) : null}
    </Entry>
  );
}
