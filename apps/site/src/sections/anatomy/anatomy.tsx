import { MarginNote } from "@helpwren/design-system";

import { Entry } from "@/components/journal";

import { AnatomySketch } from "./anatomy-sketch";
import { anatomyLayers } from "./layers";

/** Entry 07: how it is built, drawn as an exploded study of its layers. */
export function Anatomy() {
  return (
    <Entry
      id="anatomy"
      number="07"
      subject="Anatomy"
      note="Four layers, top to bottom"
      title="How it is built"
      sheetClassName="lg:min-h-[36rem]"
      sketch={
        <div className="@container relative w-full max-w-md" data-anatomy-stage>
          <AnatomySketch />
          <span
            aria-hidden="true"
            data-wren-waypoint="anatomy"
            className="absolute top-[52%] left-[42%] size-0"
          />
        </div>
      }
    >
      <p>Each layer uses only the one below it.</p>
      <ol className="mt-4 grid gap-3">
        {anatomyLayers.map((layer, index) => (
          <li key={layer.id} className="flex gap-3">
            <span className="text-muted-foreground font-mono text-xs leading-6">
              {String(index + 1)}
            </span>
            <span>
              <span className="text-foreground font-medium">{layer.name}.</span> {layer.text}
            </span>
          </li>
        ))}
      </ol>
      <MarginNote arrow="none" className="mt-4 text-xl">
        later: the library and API go public, so you can build your own interface on them
      </MarginNote>
    </Entry>
  );
}
