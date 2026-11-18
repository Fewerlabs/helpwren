import type { Meta, StoryObj } from "@storybook/react-vite";

const scale = [
  { className: "text-3xl", label: "3xl · 30px", use: "Page titles" },
  { className: "text-2xl", label: "2xl · 24px", use: "Section titles" },
  { className: "text-xl", label: "xl · 20px", use: "Card and dialog titles" },
  { className: "text-lg", label: "lg · 18px", use: "Subheadings" },
  { className: "text-base", label: "base · 16px", use: "Body text and messages" },
  { className: "text-sm", label: "sm · 14px", use: "Controls and secondary text" },
  { className: "text-xs", label: "xs · 12px", use: "Captions and timestamps" },
  { className: "text-2xs", label: "2xs · 11px", use: "Mono eyebrow labels only" },
] as const;

const weights = [
  { className: "font-normal", label: "Regular 400" },
  { className: "font-medium", label: "Medium 500" },
  { className: "font-semibold", label: "Semibold 600" },
] as const;

function Typography() {
  return (
    <div className="bg-background text-foreground space-y-10 p-8">
      <section aria-label="Type scale">
        <h2 className="mb-4 text-lg font-semibold">Figtree, for everything you read</h2>
        <ul className="space-y-4">
          {scale.map((step) => (
            <li key={step.className} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className={step.className}>All caught up.</span>
              <span className="text-muted-foreground font-mono text-xs">
                {step.label} · {step.use}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Weights">
        <h2 className="mb-4 text-lg font-semibold">Weights</h2>
        <ul className="flex flex-wrap gap-8">
          {weights.map((weight) => (
            <li key={weight.className} className={`text-xl ${weight.className}`}>
              {weight.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Monospace">
        <h2 className="mb-4 text-lg font-semibold">JetBrains Mono, for code, IDs and shortcuts</h2>
        <p className="font-mono text-sm">
          Helpwren.init({"{"} source: &quot;web&quot; {"}"})
        </p>
        <p className="text-muted-foreground text-2xs mt-2 font-mono tracking-wide uppercase">
          #open · ⌘K · ticket 1042
        </p>
      </section>

      <section aria-label="Handwriting">
        <h2 className="mb-4 text-lg font-semibold">Caveat, for a note in the margin</h2>
        <p className="font-hand text-pen text-2xl">small bird, big voice</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Only beside illustrations on the site and in the docs. Never in the interface.
        </p>
      </section>
    </div>
  );
}

const meta = {
  title: "Tokens/Typography",
  component: Typography,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = { globals: { theme: "light" } };
export const Dark: Story = { globals: { theme: "dark" } };
