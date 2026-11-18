import type { Meta, StoryObj } from "@storybook/react-vite";

import { wrenScenes } from "./scenes";
import { Wren } from "./wren";

const meta = {
  title: "Illustrations/Wren",
  component: Wren,
  args: { scene: "all-caught-up", animate: true, decorative: false },
  argTypes: { scene: { control: "select", options: wrenScenes } },
} satisfies Meta<typeof Wren>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Gallery({ animate, bird = true }: { animate: boolean; bird?: boolean }) {
  return (
    <ul className="grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
      {wrenScenes.map((scene) => (
        <li key={scene} className="border-line bg-card rounded-2xl p-5">
          <Wren scene={scene} animate={animate} bird={bird} className="mx-auto" />
          <p className="text-muted-foreground mt-3 text-center font-mono text-xs">{scene}</p>
        </li>
      ))}
    </ul>
  );
}

/** Every scene, drawing itself in. Reload the story to replay. */
export const AllScenes: Story = { render: () => <Gallery animate /> };

/** With `animate={false}` a scene is simply shown, as it also is under reduced motion. */
export const Still: Story = { render: () => <Gallery animate={false} /> };

/** Ink turns to paper in dark mode, and the pens use their dark shades. */
export const Dark: Story = {
  render: () => <Gallery animate={false} />,
  globals: { theme: "dark" },
};

/** With `bird={false}` the wren is left out, for screens that carry someone else's brand. */
export const WithoutTheWren: Story = { render: () => <Gallery animate={false} bird={false} /> };

/** At 120px, the smallest a scene is shown. Each one should still read at a glance. */
export const Small: Story = {
  render: () => (
    <ul className="flex max-w-4xl flex-wrap gap-4">
      {wrenScenes.map((scene) => (
        <li key={scene} className="border-line bg-card rounded-2xl p-3">
          <Wren scene={scene} animate={false} className="w-30" />
        </li>
      ))}
    </ul>
  ),
};
