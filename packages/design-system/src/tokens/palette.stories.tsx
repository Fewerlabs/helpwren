import type { Meta, StoryObj } from "@storybook/react-vite";

import { contrastRatio } from "../lib/contrast";
import { contrastPairs } from "./contrast-pairs";
import { parseTokens, type ThemeName } from "./parse";
import { statusNames } from "./tokens";
import css from "./tokens.css?raw";

const groups = [
  {
    title: "Paper and ink",
    names: ["paper", "card-surface", "ink", "pencil", "edge", "rule", "wash"],
  },
  { title: "Brand", names: ["moss", "pen", "highlighter", "biro", "ochre"] },
  {
    title: "Semantic roles",
    names: [
      "background",
      "foreground",
      "card",
      "popover",
      "primary",
      "secondary",
      "muted",
      "accent",
      "destructive",
      "border",
      "input",
      "ring",
    ],
  },
] as const;

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="border-line size-12 shrink-0 rounded-lg"
        style={{ backgroundColor: `var(--${name})` }}
      />
      <span>
        <span className="block text-sm font-medium">{name}</span>
        <span className="text-muted-foreground block font-mono text-xs">{value}</span>
      </span>
    </li>
  );
}

function Palette({ theme }: { theme: ThemeName }) {
  const values = parseTokens(css, theme);

  return (
    <div className="bg-background text-foreground space-y-10 p-8">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2 className="mb-4 text-lg font-semibold">{group.title}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
            {group.names.map((name) => (
              <Swatch key={name} name={name} value={values[name] ?? ""} />
            ))}
          </ul>
        </section>
      ))}

      <section aria-label="Status">
        <h2 className="mb-4 text-lg font-semibold">Status</h2>
        <ul className="flex flex-wrap gap-3">
          {statusNames.map((status) => (
            <li
              key={status}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium capitalize"
              style={{
                color: `var(--status-${status})`,
                backgroundColor: `var(--status-${status}-surface)`,
              }}
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-current" />
              {status}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Contrast">
        <h2 className="mb-4 text-lg font-semibold">Checked contrast pairs</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-rule border-b">
              <th className="py-2 font-medium" scope="col">
                Pair
              </th>
              <th className="py-2 font-medium" scope="col">
                Use
              </th>
              <th className="py-2 font-medium" scope="col">
                Ratio
              </th>
              <th className="py-2 font-medium" scope="col">
                Required
              </th>
            </tr>
          </thead>
          <tbody>
            {contrastPairs.map((pair) => (
              <tr key={`${pair.foreground}/${pair.background}`} className="border-rule border-b">
                <td className="py-2 font-mono text-xs">
                  {pair.foreground} on {pair.background}
                </td>
                <td className="py-2">{pair.use}</td>
                <td className="py-2 font-mono text-xs">
                  {contrastRatio(
                    values[pair.foreground] ?? "",
                    values[pair.background] ?? "",
                  ).toFixed(1)}
                  :1
                </td>
                <td className="py-2 font-mono text-xs">{pair.minimum}:1</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const meta = {
  title: "Tokens/Palette",
  component: Palette,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Palette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = { args: { theme: "light" }, globals: { theme: "light" } };
export const Dark: Story = { args: { theme: "dark" }, globals: { theme: "dark" } };
