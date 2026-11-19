import { CodeSnippet, Wren } from "@helpwren/design-system";

import { Entry, HandLabel, Perch, Taped } from "@/components/journal";
import { snippetTabs } from "@/content/site";

/** Entry 03: the install. The snippet is the one Settings → Installation writes. */
export function Nest() {
  return (
    <Entry
      id="nest"
      number="03"
      subject="Install"
      note="One snippet"
      title="Building the nest"
      sketch={
        <div className="@container relative w-full max-w-sm">
          <Wren scene="plugs-in" bird={false} animate={false} decorative className="max-w-none" />
          <Perch name="nest" x={28} y={47} size={20} />
          <HandLabel className="absolute top-[14%] right-0">plug: one snippet</HandLabel>
          <HandLabel className="absolute right-[2%] bottom-0">socket: your site</HandLabel>
        </div>
      }
    >
      <p>
        Deploy Helpwren to your own address, then paste one snippet into your site. Settings →
        Installation writes it for you, with your address already in it. Guest chat works at once.
      </p>
      <Taped className="mt-6">
        <CodeSnippet
          tabs={snippetTabs}
          tabsLabel="Snippet for"
          wrap
          className="text-foreground min-w-0"
        />
      </Taped>
    </Entry>
  );
}
