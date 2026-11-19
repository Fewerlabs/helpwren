import { Entry, Perch, Taped } from "@/components/journal";

import { DemoWidget } from "./demo-widget";
import { WildMotion } from "./motion";

/** Entry 05: the widget, as a visitor meets it. A demo built from the design system. */
export function Wild() {
  return (
    <Entry
      motion={<WildMotion />}
      id="wild"
      number="05"
      subject="Observed in the wild"
      note="A demo; replies are pre-written"
      title="What your visitors see"
      flip
      sketch={
        <Taped className="w-full max-w-sm">
          <div className="@container relative">
            <DemoWidget
              launcherPerch={<Perch name="wild" x={50} y={4} size={14} facing="left" />}
            />
          </div>
        </Taped>
      }
    >
      <p>
        A launcher in the corner opens the chat. Before writing, visitors see the articles your team
        put forward, and can read them right there.
      </p>
      <p>
        Logged-out visitors chat as guests. People you identify are recognised, and the team sees
        the page they wrote from.
      </p>
    </Entry>
  );
}
