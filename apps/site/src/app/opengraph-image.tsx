import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt =
  "Helpwren: live chat that plugs into any product and lives in your own database.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1a1a1a";
const PENCIL = "#666666";
const MOSS = "#3d6b57";
const PEN = "#b23520";
const HIGHLIGHTER = "#f5d547";

/** The sharing image: the wren on its branch beside the headline, in ink on white. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "#ffffff",
        padding: 80,
        gap: 40,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 22, letterSpacing: 4, color: PENCIL, display: "flex" }}>
          ENTRY 01 · FIRST SIGHTING
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            lineHeight: 1.08,
            color: INK,
            marginTop: 24,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          Live chat that plugs into any product and lives in&nbsp;
          <span style={{ background: HIGHLIGHTER, padding: "0 8px" }}>your own database.</span>
        </div>
        <div style={{ fontSize: 28, color: PENCIL, marginTop: 28, display: "flex" }}>
          Open source and self-hosted. No per-seat pricing.
        </div>
      </div>
      <svg width="300" height="300" viewBox="0 0 120 120" fill="none">
        <path
          d="M4 96C30 90 60 98 88 92 100 90 110 90 118 86"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M90 91C94 84 100 81 107 81 104 87 98 91 90 91Z"
          stroke={MOSS}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <g transform="translate(22,36)">
          <path
            d="M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M42 24.4C45 22.8 48.3 23 50.8 24.6M28 34.5C30.5 41 38 44 45 39.5M35.5 50 35 57M41.5 49.5 42.5 57"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="47.5" cy="28.2" r="1.4" fill={INK} />
        </g>
        <path
          d="M14 22C30 10 70 8 96 16"
          stroke={PEN}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
      </svg>
    </div>,
    size,
  );
}
