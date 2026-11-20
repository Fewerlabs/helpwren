import { MarginNote } from "@helpwren/design-system";

import { Entry } from "@/components/journal";
import { SceneSlot } from "@/scenes/scene-slot";

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
          <SceneSlot scene="anatomy">
            <AnatomySketch />
          </SceneSlot>
          {/* The wren flies through the gap between the chat page and the client library. */}
          <span
            aria-hidden="true"
            data-wren-waypoint="anatomy-in"
            className="absolute top-[50%] left-[12%] size-0"
          />
          <span
            aria-hidden="true"
            data-wren-waypoint="anatomy-out"
            className="absolute top-[50%] left-[78%] size-0"
          />
          {/* Names for the 3D stack's leader lines; the 3D scene moves them with the planes. */}
          {anatomyLayers.map((layer, index) => (
            <span
              key={layer.id}
              aria-hidden="true"
              data-anatomy-label
              className="font-hand text-muted-foreground pointer-events-none absolute top-0 left-0 hidden text-lg leading-none whitespace-nowrap"
            >
              {String(index + 1)} · {layer.name.toLowerCase()}
            </span>
          ))}{" "}
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
