"use client";

import { type PublicSettings } from "@helpwren/core";
import { Button } from "@helpwren/design-system";
import { createWidget, type HelpwrenWidget, type WidgetPreview as Preview } from "helpwren";
import { useEffect, useMemo, useRef } from "react";

import { readableOn } from "@/lib/accent";

export interface WidgetPreviewProps {
  /** The settings to show, saved or not. */
  settings: PublicSettings;
}

function toPreview(settings: PublicSettings): Preview {
  const { brand, widget } = settings;
  return {
    appearance: {
      position: widget.position,
      offsetX: widget.offsetX,
      offsetY: widget.offsetY,
      launcher: widget.launcher,
      // Helpwren's own green when the brand has no colour, so a removed colour shows as removed.
      accent: brand.accent ?? "#3d6b57",
      accentInk: brand.accent ? readableOn(brand.accent) : "#ffffff",
      accentTo: brand.accent ? brand.accentTo : undefined,
      logo: brand.logo,
      name: brand.name,
      welcome: widget.welcome,
      quickReplies: widget.quickReplies,
    },
    settings,
  };
}

/**
 * The widget itself, the same script a site loads, running inside a stand-in for a page. It
 * shows the settings given, so a form can be seen working before it is saved. Its launcher
 * opens and closes it and every screen can be visited; nothing typed into it is sent.
 */
export function WidgetPreview({ settings }: WidgetPreviewProps) {
  const page = useRef<HTMLDivElement>(null);
  const widget = useRef<HelpwrenWidget | null>(null);
  const preview = useMemo(() => toPreview(settings), [settings]);
  // What to start with, read when the widget is made. Later changes go through `preview()`.
  const latest = useRef(preview);

  useEffect(() => {
    latest.current = preview;
    widget.current?.preview(preview);
  }, [preview]);

  useEffect(() => {
    if (!page.current) return undefined;
    const made = createWidget(window.location.origin);
    made.init({ container: page.current, open: true, preview: latest.current });
    widget.current = made;
    return () => {
      made.destroy();
      widget.current = null;
    };
  }, []);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-2xs font-mono tracking-wider uppercase">
          Live preview
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => widget.current?.show()}>
            Open
          </Button>
          <Button variant="ghost" size="sm" onClick={() => widget.current?.hide()}>
            Closed
          </Button>
        </div>
      </div>
      <div
        ref={page}
        role="region"
        aria-label="Widget preview"
        className="border-rule bg-canvas relative h-[min(46rem,calc(100dvh-9rem))] min-h-[30rem] overflow-hidden rounded-2xl border"
      >
        {/* A suggestion of the site the widget sits on. */}
        <div aria-hidden="true" className="grid gap-3 p-5 opacity-60">
          <div className="bg-muted h-3 w-24 rounded-full" />
          <div className="bg-muted mt-4 h-6 w-3/5 rounded-full" />
          <div className="bg-muted h-3 w-4/5 rounded-full" />
          <div className="bg-muted h-3 w-2/3 rounded-full" />
          <div className="bg-muted mt-4 h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
