// Converted from docs/brand/illustrations, plus one scene drawn for the product. Ink lines use currentColor; moss, red pen and
// highlighter come from the design tokens, so every scene follows the theme.
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
        <g transform="translate(60,41.5) scale(1.25)" strokeWidth={1.28}>
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
        <g transform="translate(72,13)">
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
        <g transform="translate(70,25)">
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
        <g transform="translate(86,10.7) scale(0.9)" strokeWidth={1.78}>
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
        <g transform="translate(79.2,16.4) scale(0.8)" strokeWidth={2}>
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
        <g transform="translate(24,23)">
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
        <g transform="translate(88,32) rotate(-8 37 34) scale(1.2)" strokeWidth={1.33}>
          <FlyingBird eye={1.2} />
        </g>
      </>
    ),
  },
};
