import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Logo } from "./logo";
import { WrenFlyer } from "./wren-flyer";
import {
  WREN_BEAT_FRAMES,
  WREN_FLARE_FRAMES,
  WREN_FPS,
  wrenIdles,
  wrenViews,
  type WrenFrameKind,
  type WrenView,
} from "./wren-frames";

const meta = {
  title: "Illustrations/Wren flyer",
  component: WrenFlyer,
  args: { view: "side", frame: { kind: "beat", index: 0 } },
  argTypes: { view: { control: "select", options: wrenViews } },
} satisfies Meta<typeof WrenFlyer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Cell({ view, frame, label }: { view: WrenView; frame: WrenFrameKind; label: string }) {
  return (
    <figure className="border-line bg-card rounded-xl p-2 text-center">
      <WrenFlyer view={view} frame={frame} className="w-20" />
      <figcaption className="text-muted-foreground font-mono text-[10px]">{label}</figcaption>
    </figure>
  );
}

/** Every frame: the beat, the glide and the flare at each view angle, and the perched idles. */
export const AllFrames: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <figure className="border-line bg-card rounded-xl p-2 text-center">
          <Logo size={80} label="" />
          <figcaption className="text-muted-foreground font-mono text-[10px]">logo</figcaption>
        </figure>
      </div>
      {wrenViews.map((view) => (
        <div key={view}>
          <p className="text-muted-foreground mb-1 font-mono text-xs">{view}</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: WREN_BEAT_FRAMES }, (_, index) => (
              <Cell
                key={index}
                view={view}
                frame={{ kind: "beat", index }}
                label={`beat ${String(index)}`}
              />
            ))}
            <Cell view={view} frame={{ kind: "glide" }} label="glide" />
            {Array.from({ length: WREN_FLARE_FRAMES }, (_, index) => (
              <Cell
                key={index}
                view={view}
                frame={{ kind: "flare", index }}
                label={`flare ${String(index)}`}
              />
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-muted-foreground mb-1 font-mono text-xs">perched idles</p>
        <div className="flex flex-wrap gap-2">
          {wrenIdles.map((idle) => (
            <Cell key={idle} view="side" frame={{ kind: "idle", idle }} label={idle} />
          ))}
          <Cell view="side" frame={{ kind: "beat", index: 2, carrying: true }} label="carrying" />
        </div>
      </div>
    </div>
  ),
};

function Loop({ view }: { view: WrenView }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WREN_BEAT_FRAMES);
    }, 1000 / WREN_FPS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return <WrenFlyer view={view} frame={{ kind: "beat", index }} className="w-32" />;
}

/** The wing beat looping at twelve frames a second, at each view angle. */
export const BeatLoops: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {wrenViews.map((view) => (
        <figure key={view} className="text-center">
          <Loop view={view} />
          <figcaption className="text-muted-foreground font-mono text-xs">{view}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
