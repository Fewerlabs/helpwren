import { Sketch } from "@helpwren/design-system";

import { Entry, HandLabel, Perch } from "@/components/journal";

import { HabitatMotion } from "./motion";

/** Entry 02: why a team looks for something else. Fair and general: no products, no prices. */
export function Habitat() {
  return (
    <Entry
      motion={<HabitatMotion />}
      id="habitat"
      number="02"
      subject="Habitat under threat"
      note="Observed in most help desks"
      title="Paying by the seat, and renting your own conversations"
      flip
      sketch={
        <div className="@container relative w-full max-w-sm">
          <PriceTag />
          <HandLabel className="absolute top-[6%] left-0">price: by the head</HandLabel>
          <Perch name="habitat" x={64} y={39} size={20} facing="left" />
        </div>
      }
    >
      <p>
        Most support tools charge for every person on the team, so adding a colleague to the inbox
        is a budget decision.
      </p>
      <p>
        They also keep every conversation and article on their servers. Leaving means exporting what
        they let you export.
      </p>
    </Entry>
  );
}

/** A price tag hanging from a nail, struck out in red pen. */
function PriceTag() {
  return (
    <Sketch viewBox="0 0 220 170" data-sketch="habitat">
      <circle pathLength={1} cx="114" cy="22" r="3" />
      <path pathLength={1} d="M114 25 96 62M114 25 136 60" />
      <g className="hw-settle" style={{ transformOrigin: "114px 22px" }}>
        <path
          pathLength={1}
          d="M70 66H160C166 66 170 70 170 76V132C170 138 166 142 160 142H70C64 142 60 138 60 132V76C60 70 64 66 70 66Z"
        />
        <circle pathLength={1} cx="115" cy="78" r="4" />
        <text
          x="115"
          y="108"
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
          className="font-mono text-[13px]"
        >
          per seat
        </text>
        <text
          x="115"
          y="126"
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
          className="font-mono text-[13px]"
        >
          / month
        </text>
        <path
          className="hw-pen"
          pathLength={1}
          d="M72 112C92 100 104 122 124 106 140 94 150 118 162 100M74 128C96 114 120 134 158 118"
          stroke="var(--pen)"
          strokeWidth={2}
        />
      </g>
    </Sketch>
  );
}
