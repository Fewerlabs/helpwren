import { Sketch } from "@helpwren/design-system";

import { Entry, Perch, SpecimenTag } from "@/components/journal";

import { GrowthMotion } from "./motion";

export const levels = [
  {
    id: "level-0",
    name: "Level 0 · Snippet",
    text: "Deploy and paste the snippet. Guest chat, a help center and the team's inbox.",
  },
  {
    id: "level-1",
    name: "Level 1 · Identify",
    text: "One identify call and the team sees who they are talking to. Add a signed token and history follows people across devices.",
  },
  {
    id: "level-2",
    name: "Level 2 · Mobile",
    text: "Add the support screen to a React Native or Expo app. Chat and help inside your app.",
  },
  {
    id: "level-3",
    name: "Level 3 · Notify",
    text: "Turn on push through Expo, Firebase or a webhook, and email. People hear back.",
  },
] as const;

/** Where each level's branch is, in percent of the drawing: rising left to right. */
const branchHeights = [86, 64, 42, 20] as const;

/** Entry 04: the integration levels, each one optional and useful alone. */
export function Growth() {
  return (
    <Entry
      motion={<GrowthMotion />}
      id="growth"
      number="04"
      subject="Growth stages"
      note="Levels 0 to 3"
      title="Start with a snippet. Grow when you want to."
      pin
      sketch={
        <div className="@container relative w-full max-w-md">
          <Branches />
          {levels.map((level, index) => (
            <Perch
              key={level.id}
              name={level.id}
              x={14 + index * 24}
              y={branchHeights[index] ?? 0}
              size={14}
            />
          ))}
        </div>
      }
    >
      <p>Each level works on its own. Nobody needs a later one to get value from an earlier one.</p>
      <ol className="mt-6 grid gap-3" data-levels>
        {levels.map((level) => (
          <li key={level.id} data-level={level.id}>
            <SpecimenTag name={level.name}>{level.text}</SpecimenTag>
          </li>
        ))}
      </ol>
    </Entry>
  );
}

/** Four branches at rising heights, one per level, on one trunk. */
function Branches() {
  return (
    <Sketch viewBox="0 0 200 200" data-sketch="growth">
      <path pathLength={1} d="M188 198C184 150 190 90 182 16" />
      {branchHeights.map((height, index) => {
        const y = height * 2;
        const x = 28 + index * 48;
        return (
          <g key={height}>
            <path
              pathLength={1}
              d={`M${String(x - 22)} ${String(y + 2)}C${String(x + 30)} ${String(y - 2)} ${String(150)} ${String(y + 4)} 186 ${String(y - 6)}`}
            />
            <path
              pathLength={1}
              stroke="var(--moss)"
              d={`M${String(x + 26)} ${String(y + 1)}C${String(x + 30)} ${String(y - 8)} ${String(x + 38)} ${String(y - 10)} ${String(x + 44)} ${String(y - 6)} ${String(x + 40)} ${String(y)} ${String(x + 32)} ${String(y + 2)} ${String(x + 26)} ${String(y + 1)}Z`}
            />
            <text
              x={x - 22}
              y={y + 18}
              stroke="none"
              fill="var(--muted-foreground)"
              className="font-mono text-[9px]"
            >
              {`L${String(index)}`}
            </text>
          </g>
        );
      })}
    </Sketch>
  );
}
