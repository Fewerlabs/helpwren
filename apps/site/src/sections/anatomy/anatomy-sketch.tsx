import { ANATOMY_VIEWBOX, anatomyLayers, PLANE } from "./layers";

/** The four corners of a plane seen from above at an angle: left, back, right, front. */
function rhombus(centreY: number): string {
  const { width, depth, centreX } = PLANE;
  const half = width / 2;
  const points = [
    [centreX - half, centreY],
    [centreX, centreY - depth / 2],
    [centreX + half, centreY],
    [centreX, centreY + depth / 2],
  ];
  return points.map(([x, y]) => `${String(x)},${String(y)}`).join(" ");
}

/** A few strokes on each plane that stand for what that layer holds. */
function contents(index: number, centreY: number): string {
  const { centreX } = PLANE;
  const y = centreY;
  switch (index) {
    case 0:
      // A launcher bubble near the front corner.
      return `M${String(centreX + 30)} ${String(y + 8)}a9 5 0 1 0 0.1 0`;
    case 1:
      // Two message lines.
      return `M${String(centreX - 40)} ${String(y - 4)}L${String(centreX + 10)} ${String(y - 22)}M${String(centreX - 22)} ${String(y + 6)}L${String(centreX + 30)} ${String(y - 12)}`;
    case 2:
      // Braces, for code.
      return `M${String(centreX - 14)} ${String(y - 12)}c-8 2-8 6-4 10s4 8-4 10M${String(centreX + 14)} ${String(y - 12)}c8 2 8 6 4 10s-4 8 4 10`;
    default:
      // A database drum.
      return `M${String(centreX - 18)} ${String(y - 8)}a18 6 0 1 0 36 0a18 6 0 1 0-36 0v14a18 6 0 0 0 36 0v-14`;
  }
}

/** The exploded stack, still: the version shown without WebGL, and on phones. */
export function AnatomySketch() {
  return (
    <svg
      viewBox={`0 0 ${String(ANATOMY_VIEWBOX.width)} ${String(ANATOMY_VIEWBOX.height)}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Four layers drawn as stacked planes: the widget script on top, then the chat page, the client library, and your Supabase at the bottom."
      data-sketch="anatomy"
      className="sketch h-auto w-full"
    >
      {anatomyLayers.map((layer, index) => {
        const y = PLANE.firstY + index * PLANE.gap;
        const labelX = PLANE.centreX + PLANE.width / 2;
        return (
          <g key={layer.id} data-plane={layer.id}>
            <polygon data-draw points={rhombus(y)} fill="var(--card)" />
            <path
              data-draw
              d={contents(index, y)}
              stroke={index === 3 ? "var(--moss)" : undefined}
            />
            <path
              data-draw
              d={`M${String(labelX)} ${String(y)}H${String(labelX + 26)}`}
              strokeWidth={1}
              stroke="var(--muted-foreground)"
            />
            <text
              x={labelX + 30}
              y={y + 4}
              stroke="none"
              fill="var(--muted-foreground)"
              className="font-mono text-[11px]"
            >
              {String(index + 1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
