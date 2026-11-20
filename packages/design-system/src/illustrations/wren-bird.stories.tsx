import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../components/base/button/button";
import { Sketch } from "./sketch";
import { Wren } from "./wren";
import { WrenBird, wrenPoses } from "./wren-bird";

const meta = {
  title: "Illustrations/Wren bird",
  component: WrenBird,
  args: { pose: "perched", animate: true },
  argTypes: { pose: { control: "select", options: wrenPoses } },
} satisfies Meta<typeof WrenBird>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The wren alone. Perched, it blinks and now and then tilts its head. */
export const Default: Story = { render: (args) => <WrenBird {...args} className="w-32" /> };

/** Every pose, in the logo's box: perched, the flight poses, landing and asleep. */
export const Poses: Story = {
  render: () => (
    <ul className="flex flex-wrap gap-4">
      {wrenPoses.map((pose) => (
        <li key={pose} className="border-line bg-card rounded-2xl p-4 text-center">
          <WrenBird pose={pose} animate className="w-24" />
          <p className="text-muted-foreground mt-2 font-mono text-xs">{pose}</p>
        </li>
      ))}
    </ul>
  ),
};

function Reacting() {
  const [hops, setHops] = useState(0);
  return (
    <div className="flex items-end gap-4">
      <WrenBird react={hops === 0 ? undefined : hops} className="w-24" />
      <Button
        onClick={() => {
          setHops((count) => count + 1);
        }}
      >
        Open the chat
      </Button>
    </div>
  );
}

/** `react` makes the wren hop once, for something that happens beside it. */
export const Reaction: Story = { render: () => <Reacting /> };

function ReplayCard() {
  const [replays, setReplays] = useState(0);
  const again = () => {
    setReplays((count) => count + 1);
  };
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- hover and focus only replay a drawing
    <div
      // A card that replays its drawing on hover and keyboard focus. It does nothing else, so it
      // is a focusable group rather than a button.
      role="group"
      aria-label="A bell that rings"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the replay is for focus too
      tabIndex={0}
      onPointerEnter={again}
      onFocus={again}
      className="border-line bg-card w-64 rounded-2xl p-4"
    >
      <Wren scene="notifications" animate="in-view" replay={replays} decorative bird={false} />
      <p className="text-muted-foreground mt-2 text-center text-sm">Hover or focus to replay</p>
    </div>
  );
}

/** `replay` draws a scene again with its small action: here the bell rings. */
export const Replay: Story = { render: () => <ReplayCard /> };

/**
 * With `animate="in-view"`, scenes and sketches wait below the screen and draw themselves as
 * they scroll in, then pause their small movements while off screen. Scroll down.
 */
export const DrawsInView: Story = {
  render: () => (
    <div className="space-y-[80vh] pb-[20vh]">
      <p className="text-muted-foreground text-sm">Scroll down.</p>
      <Wren scene="self-hosted" animate="in-view" />
      <Sketch viewBox="0 0 200 60" label="A branch with a leaf">
        <path pathLength={1} d="M4 40C50 34 96 42 140 36 164 33 182 34 196 28" />
        <g className="hw-leaf" stroke="var(--moss)">
          <path pathLength={1} d="M150 35C156 26 165 23 174 24 170 32 160 36 150 35Z" />
        </g>
      </Sketch>
      <WrenBird pose="asleep" animate="in-view" className="w-24" />
    </div>
  ),
};
