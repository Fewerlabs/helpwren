import Image, { getImageProps } from "next/image";
import Link from "next/link";

import { hasBrand } from "@/lib/brand";

/**
 * Glown's wordmark, dark on a light page and light on a dark one, or the word "Glown" when the
 * brand files are not there. `label` says which part of the product this is.
 */
export function Logo({ label }: { label?: string }) {
  if (!hasBrand) {
    return (
      <Link href="/" className="brand">
        Glown{label ? ` ${label}` : ""}
      </Link>
    );
  }
  // SVGs are drawn as they are, not through the image optimiser, so each is its own address.
  const { props: light } = getImageProps({
    alt: "Glown",
    width: 112,
    height: 32,
    unoptimized: true,
    preload: true,
    src: "/brand/glown-full-dark.svg",
  });
  return (
    <Link href="/" className="brand">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet="/brand/glown-full-light.svg" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- The alt text is in `light`. */}
        <img {...light} className="logo" />
      </picture>
      {label ? <span className="muted">{label}</span> : null}
    </Link>
  );
}

const COVERS = {
  site: { src: "/brand/glown_cover.png", width: 1200, height: 630 },
  business: { src: "/brand/glown_business_cover.png", width: 1209, height: 614 },
} as const;

/** One of Glown's cover pictures, when the brand files are there. Decoration only. */
export function Cover({ kind }: { kind: keyof typeof COVERS }) {
  if (!hasBrand) return null;
  return <Image {...COVERS[kind]} alt="" preload className="cover" />;
}
