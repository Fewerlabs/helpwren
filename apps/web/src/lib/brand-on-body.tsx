"use client";

import { type Brand } from "@helpwren/core";
import { useEffect } from "react";

import { brandProps } from "./accent";

/**
 * Puts the brand's colours on the page's body as well, for what opens above the page in a
 * portal, such as a sheet, a dialog or a menu, outside the element they are set on. Portals only
 * open once the page is running, so setting them here, after it starts, is in time.
 */
export function BrandOnBody({ brand }: { brand: Pick<Brand, "accent" | "accentTo" | "button"> }) {
  const { accent, accentTo, button } = brand;
  useEffect(() => {
    const props = brandProps({ accent, accentTo, button });
    if (!props) return undefined;
    const body = document.body;
    const properties = Object.entries(props.style) as [string, string][];
    for (const [name, value] of properties) body.style.setProperty(name, value);
    body.dataset.brand = "";
    if ("data-brand-accent" in props) body.dataset.brandAccent = "";
    return () => {
      for (const [name] of properties) body.style.removeProperty(name);
      delete body.dataset.brand;
      delete body.dataset.brandAccent;
    };
  }, [accent, accentTo, button]);
  return null;
}
