// The first six scenes are converted from docs/brand/illustrations; the rest were drawn for the product in the same line.
// Ink lines use currentColor; moss, red pen and highlighter come from the design tokens, so every scene follows the theme.
// The wren's group in every scene has the class hw-bird, which is what `bird={false}` hides.
import type { ReactNode } from "react";

/** The wren itself, shared by every scene. Only the eye changes size with the scale. */
function Bird({ eye }: { eye: number }) {
  return (
    <g className="hw-bob">
      <path
        pathLength={1}
        d="M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z"
      />
      <path
        pathLength={1}
        d="M42 24.4C45 22.8 48.3 23 50.8 24.6M28 34.5C30.5 41 38 44 45 39.5M35.5 50 35 57M41.5 49.5 42.5 57"
      />
      <circle cx="47.5" cy="28.2" r={eye} fill="currentColor" stroke="none" />
    </g>
  );
}

/**
 * The wren in flight: the same body with a raised wing and tucked feet. This pose
 * is not on the brand boards; it was drawn for the product in the same line.
 */
function FlyingBird({ eye }: { eye: number }) {
  return (
    <g className="hw-fly">
      <path
        pathLength={1}
        d="M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z"
      />
      <g className="hw-flap">
        <path pathLength={1} d="M31 30.5C27.5 24.5 28 16.5 32 11.5 38 15.5 42.5 22.5 44 29.5" />
        <path pathLength={1} d="M34 17.5C36 21.5 38.5 25 41 28" />
      </g>
      <path pathLength={1} d="M42 24.4C45 22.8 48.3 23 50.8 24.6M34.5 50 31 54.5M40.5 49.8 38 55" />
      <circle cx="47.5" cy="28.2" r={eye} fill="currentColor" stroke="none" />
    </g>
  );
}

export const wrenScenes = [
  "all-caught-up",
  "conversations",
  "help-articles",
  "help-for-this-page",
  "self-hosted",
  "plugs-in",
  "flying",
  "no-results",
  "nothing-here",
  "error",
  "not-found",
  "ticket",
  "resolved",
  "team",
  "settings",
  "branding",
  "notifications",
  "attachments",
  "visitors",
  "offline",
  "welcome",
  "sign-in",
  "first-article",
  "open-source",
] as const;

export type WrenScene = (typeof wrenScenes)[number];

export const scenes: Record<WrenScene, { label: string; content: ReactNode }> = {
  "all-caught-up": {
    label: "A wren perched on a branch, with a ticked box",
    content: (
      <>
        <circle className="hw-hl" cx="41" cy="47" r="18" fill="var(--highlighter)" stroke="none" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M30 45 40 56 61 29"
          stroke="var(--pen)"
          strokeWidth={2.2}
        />
        <path pathLength={1} d="M12 116C50 110 92 118 132 112 152 109 174 111 206 102" />
        <g className="hw-leaf" stroke="var(--moss)">
          <path pathLength={1} d="M150 110C157 100 165 95 176 92" />
          <path pathLength={1} d="M176 92C181 83 190 82 194 86 191 93 183 95 176 92Z" />
        </g>
        <g className="hw-leaf" stroke="var(--moss)">
          <path pathLength={1} d="M58 113C53 104 56 96 63 93 68 99 66 108 58 113Z" />
        </g>
        <g className="hw-leaf hw-leaf2" stroke="var(--moss)">
          <path pathLength={1} d="M34 114C28 120 28 128 33 132 39 128 40 120 34 114Z" />
        </g>
        <g className="hw-bird" transform="translate(60,41.5) scale(1.25)" strokeWidth={1.28}>
          <Bird eye={1.15} />
        </g>
      </>
    ),
  },
  conversations: {
    label: "A wren standing on a speech bubble",
    content: (
      <>
        <path
          pathLength={1}
          d="M52 70H140C147 70 152 75 152 82V110C152 117 147 122 140 122H78L62 136 64 122H52C45 122 40 117 40 110V82C40 75 45 70 52 70Z"
        />
        <rect
          className="hw-hl"
          x="56"
          y="82"
          width="68"
          height="11"
          rx="3"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M58 88H120M58 100H102" />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M172 98H196C200 98 203 101 203 105V122C203 126 200 129 196 129H190L191 138 180 129H172C168 129 165 126 165 122V105C165 101 168 98 172 98Z"
        />
        <circle className="hw-typing" cx="177" cy="113.5" r="2" fill="var(--pen)" stroke="none" />
        <circle
          className="hw-typing hw-typing2"
          cx="184"
          cy="113.5"
          r="2"
          fill="var(--pen)"
          stroke="none"
        />
        <circle
          className="hw-typing hw-typing3"
          cx="191"
          cy="113.5"
          r="2"
          fill="var(--pen)"
          stroke="none"
        />
        <g className="hw-bird" transform="translate(72,13)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  "help-articles": {
    label: "A wren standing on a stack of books",
    content: (
      <>
        <rect pathLength={1} x="48" y="118" width="112" height="17" rx="2" />
        <path pathLength={1} d="M62 118V135M146 123H152M146 129H152" />
        <g stroke="var(--moss)">
          <rect pathLength={1} x="58" y="101" width="94" height="17" rx="2" />
          <path pathLength={1} d="M136 101V118M68 109.5H120" />
        </g>
        <g className="hw-lift">
          <path
            className="hw-hl hw-nodraw"
            d="M64 84 146 80 147 97 65 101Z"
            transform="translate(2,-2)"
            fill="var(--highlighter)"
            stroke="none"
          />
          <path pathLength={1} d="M64 84 146 80 147 97 65 101Z" />
          <path
            className="hw-pen"
            pathLength={1}
            d="M124 98 124 112 128 108 132 112 132 98"
            stroke="var(--pen)"
            strokeWidth={1.8}
          />
          <path pathLength={1} d="M78 83.4 79 100.3" />
        </g>
        <g className="hw-bird" transform="translate(70,25)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  "help-for-this-page": {
    label: "A wren on top of a browser window, pointing at part of the page",
    content: (
      <>
        <rect pathLength={1} x="20" y="62" width="140" height="92" rx="6" />
        <path pathLength={1} d="M20 78H160" />
        <circle pathLength={1} cx="30" cy="70" r="1.6" />
        <circle pathLength={1} cx="37" cy="70" r="1.6" />
        <circle pathLength={1} cx="44" cy="70" r="1.6" />
        <path pathLength={1} d="M32 92H84M32 104H70" />
        <rect
          className="hw-hl"
          x="35"
          y="114"
          width="62"
          height="24"
          rx="3"
          fill="var(--highlighter)"
          stroke="none"
        />
        <rect x="32" y="116" width="64" height="26" rx="4" strokeDasharray="4 4" />
        <path pathLength={1} d="M112 92H148M112 104H148M112 116H138" />
        <path
          className="hw-point"
          pathLength={1}
          d="M172 96C182 112 170 132 106 130"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <path
          className="hw-pen"
          pathLength={1}
          d="M113 124 105 130 113 136"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M176 76C176 70 186 70 186 77 186 81 181 81 181 86"
        />
        <circle cx="181" cy="91.5" r="0.9" fill="var(--moss)" stroke="var(--moss)" />
        <g className="hw-bird" transform="translate(86,10.7) scale(0.9)" strokeWidth={1.78}>
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  "self-hosted": {
    label: "A wren on the roof of a birdhouse",
    content: (
      <>
        <path pathLength={1} d="M110 166V144" />
        <path pathLength={1} d="M80 144H140" />
        <rect
          className="hw-hl"
          x="90"
          y="94"
          width="44"
          height="47"
          rx="2"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M86 144V92M134 144V92" />
        <path pathLength={1} d="M74 96 110 62 146 96" />
        <circle
          className="hw-pen"
          pathLength={1}
          cx="110"
          cy="110"
          r="9"
          stroke="var(--pen)"
          strokeWidth={1.9}
        />
        <path pathLength={1} d="M104 128H116" />
        <g className="hw-grass" stroke="var(--moss)">
          <path
            pathLength={1}
            d="M162 150C168 142 166 134 172 128M172 150C174 144 180 142 182 136M50 150C48 142 54 138 52 130"
          />
        </g>
        <g className="hw-bird" transform="translate(79.2,16.4) scale(0.8)" strokeWidth={2}>
          <Bird eye={1.4} />
        </g>
      </>
    ),
  },
  "plugs-in": {
    label: "A wren sitting on a cable that is about to be plugged in",
    content: (
      <>
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M8 120C40 120 30 80 60 80 84 80 78 112 104 110"
        />
        <rect pathLength={1} x="104" y="98" width="30" height="24" rx="6" />
        <path pathLength={1} d="M134 105H144M134 115H144" />
        <g className="hw-socket">
          <rect
            className="hw-hl"
            x="168"
            y="88"
            width="31"
            height="41"
            rx="5"
            fill="var(--highlighter)"
            stroke="none"
          />
          <rect pathLength={1} x="164" y="88" width="34" height="44" rx="6" />
          <path pathLength={1} d="M174 105H180M174 115H180" />
        </g>
        <path
          className="hw-spark hw-nodraw"
          d="M141 96 145 90M143 124 147 130M140 110H148"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <g className="hw-bird" transform="translate(24,23)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  flying: {
    label: "A wren in flight, carrying a letter",
    content: (
      <>
        <path
          className="hw-nodraw"
          d="M12 138C40 150 58 118 84 112"
          stroke="var(--pen)"
          strokeWidth={1.8}
          strokeDasharray="4 5"
        />
        <g stroke="var(--moss)">
          <path pathLength={1} d="M22 62C22 53 35 51 38 58 42 51 55 54 53 62Z" />
          <path pathLength={1} d="M166 44C166 37 177 35 180 41 183 36 194 38 193 44Z" />
        </g>
        <path pathLength={1} d="M74 78H88M66 90H84M76 102H88" />
        <rect
          className="hw-hl"
          x="132"
          y="103"
          width="38"
          height="25"
          rx="3"
          fill="var(--highlighter)"
          stroke="none"
        />
        <rect pathLength={1} x="128" y="106" width="38" height="25" rx="3" />
        <path pathLength={1} d="M128 108 147 121 166 108" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M134 100 138 106M150 100 147 106"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <g
          className="hw-bird"
          transform="translate(88,32) rotate(-8 37 34) scale(1.2)"
          strokeWidth={1.33}
        >
          <FlyingBird eye={1.2} />
        </g>
      </>
    ),
  },
  "no-results": {
    label: "A wren looking through a magnifying glass and finding a question mark",
    content: (
      <>
        <path pathLength={1} d="M24 140C70 136 150 143 198 138" />
        <g className="hw-grass" stroke="var(--moss)">
          <path pathLength={1} d="M24 139C22 133 26 130 24 125M32 139C33 134 37 132 37 128" />
        </g>
        <circle className="hw-hl" cx="141" cy="89" r="24" fill="var(--highlighter)" stroke="none" />
        <circle pathLength={1} cx="138" cy="92" r="27" />
        <path pathLength={1} d="M160 109 182 131C184 133 180 137 178 135L156 113" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M130 85C130 75 146 75 146 86 146 92 138 92 138 99"
          stroke="var(--pen)"
          strokeWidth={2.2}
        />
        <circle cx="138" cy="106" r="1.1" fill="var(--pen)" stroke="var(--pen)" />
        <g className="hw-bird" transform="translate(30,82)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  "nothing-here": {
    label: "A wren perched on the flap of an empty open box",
    content: (
      <>
        <path
          className="hw-hl hw-nodraw"
          d="M64 99 84 85H160L140 99Z"
          fill="var(--highlighter)"
          stroke="none"
        />
        <rect pathLength={1} x="60" y="100" width="80" height="46" rx="1" />
        <path pathLength={1} d="M140 100 162 84V130L140 146" />
        <path pathLength={1} d="M60 100 82 84H162" />
        <path pathLength={1} d="M82 84 86 66H166L162 84" />
        <path pathLength={1} d="M60 100 40 92 62 76 82 84" />
        <path pathLength={1} d="M72 126H98M72 135H90" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M112 100V113H120V100"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <g className="hw-leaf" stroke="var(--moss)">
          <path pathLength={1} d="M178 50C183 41 192 40 196 44 193 51 185 53 178 50Z" />
          <path pathLength={1} d="M178 50C175 54 173 58 172 63" />
        </g>
        <g className="hw-bird" transform="translate(82,9)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  error: {
    label: "A wren standing on an ink bottle that has tipped over and spilled",
    content: (
      <>
        <path pathLength={1} d="M18 141C40 139 80 142 118 141" />
        <rect
          className="hw-hl"
          x="64"
          y="111"
          width="27"
          height="23"
          rx="2"
          fill="var(--highlighter)"
          stroke="none"
        />
        <rect pathLength={1} x="50" y="108" width="54" height="32" rx="5" />
        <path pathLength={1} d="M104 116H115V132H104" />
        <rect pathLength={1} x="115" y="112" width="6" height="24" rx="2" />
        <path pathLength={1} d="M62 114V134H88V114Z" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M122 129C134 127 142 134 156 132 170 130 184 135 182 141 180 147 150 147 132 146 122 145 117 140 122 135"
          stroke="var(--pen)"
          strokeWidth={1.9}
        />
        <path
          className="hw-pen"
          pathLength={1}
          d="M150 92 151 110"
          stroke="var(--pen)"
          strokeWidth={2.2}
        />
        <circle cx="151.5" cy="118" r="1.1" fill="var(--pen)" stroke="var(--pen)" />
        <path pathLength={1} stroke="var(--moss)" d="M190 124 201 121 205 137 194 140Z" />
        <g className="hw-bird" transform="translate(38,51)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  "not-found": {
    label: "A wren on a signpost whose two signs point opposite ways",
    content: (
      <>
        <path pathLength={1} d="M64 162C90 160 130 164 158 161" />
        <path
          className="hw-hl hw-nodraw"
          d="M117 75H160L171 85 160 95H117Z"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M106 162V66H114V162" />
        <path pathLength={1} d="M114 78H160L172 88 160 98H114" />
        <path pathLength={1} d="M106 108H62L50 118 62 128H106" />
        <path pathLength={1} d="M124 88H152M70 118H96" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M166 116C166 108 180 108 180 117 180 122 173 122 173 128"
          stroke="var(--pen)"
          strokeWidth={2}
        />
        <circle cx="173" cy="135" r="1.1" fill="var(--pen)" stroke="var(--pen)" />
        <g className="hw-grass" stroke="var(--moss)">
          <path pathLength={1} d="M92 162C90 154 94 150 92 144M126 162C128 155 132 153 132 147" />
        </g>
        <g className="hw-bird" transform="translate(71,9)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  ticket: {
    label: "A wren on a twig, holding a ticket in its beak",
    content: (
      <>
        <path pathLength={1} d="M6 101C28 97 52 100 78 96" />
        <g className="hw-leaf" stroke="var(--moss)">
          <path pathLength={1} d="M22 99C17 90 20 82 27 79 32 85 30 94 22 99Z" />
        </g>
        <g transform="translate(80,62) rotate(9)">
          <rect
            className="hw-hl"
            x="17"
            y="11"
            width="48"
            height="13"
            rx="3"
            fill="var(--highlighter)"
            stroke="none"
          />
          <path
            pathLength={1}
            d="M5 0H103C106 0 108 2 108 5V21C101 21 101 39 108 39V55C108 58 106 60 103 60H5C2 60 0 58 0 55V39C7 39 7 21 0 21V5C0 2 2 0 5 0Z"
          />
          <path d="M78 4V56" strokeDasharray="4 4" />
          <path pathLength={1} d="M18 20H60M18 32H48M18 44H54" />
          <path
            className="hw-pen"
            pathLength={1}
            d="M85 31 90 38 100 23"
            stroke="var(--pen)"
            strokeWidth={2.2}
          />
        </g>
        <g className="hw-bird" transform="translate(8,30) scale(1.2)" strokeWidth={1.33}>
          <Bird eye={1.2} />
        </g>
      </>
    ),
  },
  resolved: {
    label: "A wren beside a rosette with a tick on it",
    content: (
      <>
        <path pathLength={1} d="M22 147C60 144 120 149 190 145" />
        <circle className="hw-hl" cx="131" cy="71" r="22" fill="var(--highlighter)" stroke="none" />
        <circle pathLength={1} cx="128" cy="74" r="30" />
        <circle pathLength={1} cx="128" cy="74" r="22" />
        <path pathLength={1} d="M113 100 103 141 116 134 124 146 130 104" />
        <path pathLength={1} d="M130 104 137 146 145 134 157 141 144 99" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M116 74 125 85 142 62"
          stroke="var(--pen)"
          strokeWidth={2.2}
        />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M178 48V62M171 55H185M82 40V50M77 45H87M186 96V104M182 100H190"
        />
        <g className="hw-bird" transform="translate(24,89)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  team: {
    label: "Three wrens sitting together on a wire",
    content: (
      <>
        <circle className="hw-hl" cx="178" cy="48" r="16" fill="var(--highlighter)" stroke="none" />
        <path pathLength={1} stroke="var(--moss)" d="M22 56C22 47 35 45 38 52 42 45 55 48 53 56Z" />
        <path pathLength={1} d="M6 118C60 130 150 132 214 114" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M144 64V76M138 70H150"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <g className="hw-bird" transform="translate(12,66)">
          <Bird eye={1.3} />
        </g>
        <g className="hw-bird" transform="translate(68,62) scale(1.15)" strokeWidth={1.39}>
          <Bird eye={1.2} />
        </g>
        <g className="hw-bird" transform="translate(211,65) scale(-1,1)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  settings: {
    label: "A wren sitting on the handle of a toolbox",
    content: (
      <>
        <path pathLength={1} d="M20 149C70 147 150 151 204 148" />
        <rect
          className="hw-hl"
          x="60"
          y="123"
          width="104"
          height="19"
          rx="3"
          fill="var(--highlighter)"
          stroke="none"
        />
        <rect pathLength={1} x="52" y="104" width="116" height="44" rx="5" />
        <path pathLength={1} d="M52 118H103M117 118H168" />
        <path pathLength={1} d="M88 104V94C88 90 91 88 95 88H125C129 88 132 90 132 94V104" />
        <rect
          className="hw-pen"
          pathLength={1}
          x="103"
          y="111"
          width="14"
          height="13"
          rx="2"
          stroke="var(--pen)"
          strokeWidth={1.9}
        />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M184 105C180 99 183 91 190 89L189 97 195 100 200 94C203 101 199 108 192 108L187 146C186 150 180 149 181 145Z"
        />
        <g className="hw-bird" transform="translate(71,31)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  branding: {
    label: "A wren on a paint pot, beside a brush and three colour cards",
    content: (
      <>
        <path pathLength={1} d="M18 148C70 146 150 150 204 147" />
        <rect
          className="hw-hl"
          x="75"
          y="118"
          width="52"
          height="15"
          rx="2"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M70 104C70 96 130 96 130 104 130 112 70 112 70 104Z" />
        <path pathLength={1} d="M70 104V140C70 148 130 148 130 140V104" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M108 111C108 118 106 125 110 127 114 125 112 118 113 111"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <path pathLength={1} d="M33 145 49 108 55 110 39 147Z" />
        <path pathLength={1} d="M49 108 52 100 58 102 55 110" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M52 100C52 92 58 86 62 85 63 92 61 98 58 102"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <g transform="rotate(7 168 146)">
          <rect pathLength={1} x="150" y="82" width="36" height="64" rx="3" />
          <rect
            className="hw-hl"
            x="156"
            y="88"
            width="24"
            height="14"
            rx="2"
            fill="var(--highlighter)"
            stroke="none"
          />
          <rect pathLength={1} x="156" y="107" width="24" height="14" rx="2" stroke="var(--moss)" />
          <rect pathLength={1} x="156" y="126" width="24" height="14" rx="2" stroke="var(--pen)" />
        </g>
        <g className="hw-bird" transform="translate(58,41)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  notifications: {
    label: "A wren perched on top of a ringing bell",
    content: (
      <>
        <circle
          className="hw-hl"
          cx="113"
          cy="102"
          r="17"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path
          pathLength={1}
          d="M88 122V100C88 86 97 76 110 76 123 76 132 86 132 100V122L141 133H79Z"
        />
        <path pathLength={1} d="M102 133C102 143 118 143 118 133" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M70 90C65 98 65 108 70 116M58 84C50 96 50 110 58 122M150 90C155 98 155 108 150 116M162 84C170 96 170 110 162 122"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M172 40H194C197 40 199 42 199 45V57C199 60 197 62 194 62H184L177 69 178 62H172C169 62 167 60 167 57V45C167 42 169 40 172 40Z"
        />
        <path pathLength={1} stroke="var(--moss)" d="M175 51H191" />
        <g className="hw-bird" transform="translate(71.2,19)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  attachments: {
    label: "A wren looking at a sheet of paper held by a large paperclip",
    content: (
      <>
        <path pathLength={1} d="M20 151C70 149 150 153 208 150" />
        <rect
          className="hw-hl"
          x="108"
          y="98"
          width="40"
          height="12"
          rx="3"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M98 62H150L168 80V150H98Z" />
        <path pathLength={1} d="M150 62V80H168" />
        <path pathLength={1} d="M110 104H156M110 117H156M110 130H140" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M122 66V88C122 97 106 97 106 88V56C106 47 118 47 118 56V84C118 89 111 89 111 84V64"
          stroke="var(--pen)"
          strokeWidth={2}
        />
        <g stroke="var(--moss)">
          <rect pathLength={1} x="178" y="112" width="30" height="26" rx="3" />
          <path pathLength={1} d="M180 134 189 123 195 129 200 124 206 131" />
        </g>
        <g className="hw-bird" transform="translate(24,93)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  visitors: {
    label: "A wren on a crate, looking through a telescope at birds far away",
    content: (
      <>
        <path pathLength={1} d="M14 151C70 149 150 153 206 150" />
        <circle className="hw-hl" cx="186" cy="52" r="13" fill="var(--highlighter)" stroke="none" />
        <rect pathLength={1} x="30" y="120" width="50" height="30" rx="2" />
        <path pathLength={1} d="M30 135H80" />
        <path
          pathLength={1}
          d="M82.6 86.2 128.6 69.2 127.3 65.5 179.3 46.5 184.7 61.5 132.7 80.5 131.4 76.8 85.4 93.8Z"
        />
        <path pathLength={1} d="M128.6 69.2 131.4 76.8" />
        <path pathLength={1} d="M134 80 116 150M136 79 140 150M138 78 162 150" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M179.3 46.5 184.7 61.5"
          stroke="var(--pen)"
          strokeWidth={2.4}
        />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M142 28C145 23 149 23 151 28 153 23 157 23 160 27M176 16C178 13 181 13 182 16 183 13 186 13 188 16"
        />
        <g className="hw-bird" transform="translate(18,63)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  offline: {
    label: "A wren on a pole, looking at a wire that has snapped in two",
    content: (
      <>
        <path pathLength={1} d="M14 161C70 159 150 163 206 160" />
        <circle
          className="hw-hl"
          cx="112"
          cy="110"
          r="18"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M40 160V60M28 72H52M180 160V60M168 72H192" />
        <path pathLength={1} d="M40 72C50 98 68 110 84 126" />
        <path pathLength={1} d="M180 72C170 98 152 110 138 124" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M116 92 106 110H118L108 128"
          stroke="var(--pen)"
          strokeWidth={2.2}
        />
        <g className="hw-grass" stroke="var(--moss)">
          <path pathLength={1} d="M52 160C54 152 50 148 54 142M168 160C166 153 170 150 168 144" />
        </g>
        <g className="hw-bird" transform="translate(1.5,3)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  welcome: {
    label: "A wren standing under a string of flags",
    content: (
      <>
        <path
          className="hw-hl hw-nodraw"
          d="M64 48 85 50 74 73ZM139 49.5 160 47 151 72Z"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M10 34C60 54 160 54 210 30" />
        <path pathLength={1} d="M62 46 83 48 72 71ZM137 47.5 158 45 149 70Z" />
        <path pathLength={1} stroke="var(--moss)" d="M25 39 46 44 34 66ZM174 42 195 36 187 63Z" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M99 48.5 121 48.5 110 73Z"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <path pathLength={1} d="M40 147C80 145 140 149 180 146" />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M52 100V112M46 106H58M172 104V114M167 109H177"
        />
        <g className="hw-bird" transform="translate(62,75) scale(1.25)" strokeWidth={1.28}>
          <Bird eye={1.15} />
        </g>
      </>
    ),
  },
  "sign-in": {
    label: "A wren holding a key in its beak, in front of a padlock",
    content: (
      <>
        <path pathLength={1} d="M18 147C70 145 150 149 206 146" />
        <rect
          className="hw-hl"
          x="133"
          y="87"
          width="58"
          height="51"
          rx="6"
          fill="var(--highlighter)"
          stroke="none"
        />
        <rect pathLength={1} x="128" y="84" width="64" height="58" rx="7" />
        <path pathLength={1} d="M143 84V66C143 44 177 44 177 66V84" />
        <circle pathLength={1} cx="160" cy="107" r="5" />
        <path pathLength={1} d="M160 112V125" />
        <circle
          className="hw-pen"
          pathLength={1}
          cx="92"
          cy="113"
          r="8"
          stroke="var(--pen)"
          strokeWidth={2}
        />
        <path
          className="hw-pen"
          pathLength={1}
          d="M100 113H123M115 113V121M121 113V120"
          stroke="var(--pen)"
          strokeWidth={2}
        />
        <g className="hw-grass" stroke="var(--moss)">
          <path pathLength={1} d="M200 146C202 139 198 135 202 130M24 146C22 140 26 137 24 132" />
        </g>
        <g className="hw-bird" transform="translate(8,77.6) scale(1.2)" strokeWidth={1.33}>
          <Bird eye={1.2} />
        </g>
      </>
    ),
  },
  "first-article": {
    label: "A wren standing on an open book with blank pages, next to a pencil",
    content: (
      <>
        <path
          className="hw-hl hw-nodraw"
          d="M119 103C130 98 146 97 160 101V113C146 109 130 110 119 115Z"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M110 98C96 89 70 88 50 94V142C70 136 96 137 110 146" />
        <path pathLength={1} d="M110 98C124 89 150 88 170 94V142C150 136 124 137 110 146" />
        <path pathLength={1} d="M110 98V146" />
        <path
          d="M120 122C132 117 146 116 160 119M120 133C130 129 140 128 150 129"
          strokeDasharray="4 4"
        />
        <path
          className="hw-pen"
          pathLength={1}
          d="M166 128 169.4 119 199.4 85.6 204.6 90.4 174.6 123.8ZM195 90.5 200.2 95.2"
          stroke="var(--pen)"
          strokeWidth={1.8}
        />
        <path pathLength={1} stroke="var(--moss)" d="M105 144V158L110 153 115 158V145" />
        <g className="hw-bird" transform="translate(42,33)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
  "open-source": {
    label: "A wren perched on a pair of angle brackets with a heart between them",
    content: (
      <>
        <circle
          className="hw-hl"
          cx="113"
          cy="109"
          r="21"
          fill="var(--highlighter)"
          stroke="none"
        />
        <path pathLength={1} d="M70 86 40 112 70 138M150 86 180 112 150 138" />
        <path
          className="hw-pen"
          pathLength={1}
          d="M110 128C92 114 96 96 110 106 124 96 128 114 110 128Z"
          stroke="var(--pen)"
          strokeWidth={2.2}
        />
        <path
          pathLength={1}
          stroke="var(--moss)"
          d="M50 60V74M43 67H57M192 134V144M187 139H197M86 150V158M82 154H90"
        />
        <g className="hw-bird" transform="translate(111,29)">
          <Bird eye={1.3} />
        </g>
      </>
    ),
  },
};
