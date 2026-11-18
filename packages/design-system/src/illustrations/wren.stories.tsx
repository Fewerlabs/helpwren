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

function Gallery({ animate }: { animate: boolean }) {
  return (
    <ul className="grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
      {wrenScenes.map((scene) => (
        <li key={scene} className="border-line bg-card rounded-2xl p-5">
          <Wren scene={scene} animate={animate} className="mx-auto" />
          <p className="text-muted-foreground mt-3 text-center font-mono text-xs">{scene}</p>
        </li>
      ))}
    </ul>
  );
}

/** All six scenes, drawing themselves in. Reload the story to replay. */
export const AllScenes: Story = { render: () => <Gallery animate /> };

/** With `animate={false}` a scene is simply shown, as it also is under reduced motion. */
export const Still: Story = { render: () => <Gallery animate={false} /> };

/** Ink turns to paper in dark mode, and the pens use their dark shades. */
export const Dark: Story = {
  render: () => <Gallery animate={false} />,
  globals: { theme: "dark" },
};
