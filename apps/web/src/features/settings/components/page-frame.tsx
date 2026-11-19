"use client";

import { Link } from "@helpwren/design-system";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface PageFrameProps {
  /** What the page is, for the region's name, such as "Help center preview". */
  label: string;
  /** Where the real page is, opened in a new tab from above the frame. */
  href: string;
  /** The words of that link, such as "Open the help center". */
  linkLabel: string;
  /** The size the page is drawn at, as on a laptop, before it is shrunk to fit. */
  width: number;
  height: number;
  children: ReactNode;
}

/**
 * A public page drawn at full size and shrunk to fit beside a settings form, in a stand-in for a
 * browser window, so it reads as a page and not as part of the form.
 */
export function PageFrame({ label, href, linkLabel, width, height, children }: PageFrameProps) {
  // How much to shrink the page by follows the room there is for it.
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.34);
  useEffect(() => {
    const element = frame.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [width]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-2xs font-mono tracking-wider uppercase">
          Live preview
        </p>
        <Link href={href} target="_blank">
          {linkLabel}
        </Link>
      </div>
      <div
        ref={frame}
        role="region"
        aria-label={label}
        className="border-rule bg-canvas overflow-hidden rounded-2xl border"
        style={{ height: height * scale + 28 }}
      >
        <div
          aria-hidden="true"
          className="border-rule bg-card flex h-7 items-center gap-1.5 border-b px-3"
        >
          <span className="bg-muted size-2 rounded-full" />
          <span className="bg-muted size-2 rounded-full" />
          <span className="bg-muted size-2 rounded-full" />
        </div>
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
