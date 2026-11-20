import { Wren } from "@helpwren/design-system";

import { Entry, HandLabel, Perch, SpecimenTag } from "@/components/journal";

const traits = [
  { name: "Your address", text: "One install per product, at an address you choose." },
  { name: "Your database", text: "Everything is stored in your own Supabase project." },
  { name: "No seat pricing", text: "Add the whole team. There is nothing to count." },
  { name: "MIT licence", text: "Read it, change it, run it. The code is yours too." },
] as const;

/** Entry 08: self-hosted, and what that means for the team. */
export function HomeRange() {
  return (
    <Entry
      id="home-range"
      number="08"
      subject="Home range"
      note="Self-hosted"
      title="It lives where you live"
      flip
      sketch={
        <div className="@container relative w-full max-w-sm">
          <Wren
            scene="self-hosted"
            bird={false}
            animate="in-view"
            decorative
            className="max-w-none"
          />
          <HandLabel className="absolute top-[4%] right-0">nest: your own database</HandLabel>
          <Perch name="home-range" x={50} y={36.5} size={20} />
        </div>
      }
    >
      <p>
        Helpwren runs on your own servers and your own Supabase project. The conversations, the
        contacts and the articles stay in your database.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {traits.map((trait) => (
          <li key={trait.name}>
            <SpecimenTag name={trait.name}>{trait.text}</SpecimenTag>
          </li>
        ))}
      </ul>
    </Entry>
  );
}
