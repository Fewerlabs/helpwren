/**
 * A capture of the running product (made by scripts/capture.mjs), in the theme on screen. Both
 * themes are in the page; the hidden one is never downloaded, because lazy images that are not
 * displayed are not fetched.
 */
export const captures = {
  widget: {
    width: 432,
    height: 776,
    alt: "The Helpwren widget open on a page: a greeting, buttons to send a message or submit a ticket, and suggested articles.",
  },
  conversation: {
    width: 431,
    height: 775,
    alt: "A conversation in the Helpwren widget: the visitor's message, sent.",
  },
  inbox: {
    width: 1440,
    height: 900,
    alt: "The team's inbox: views, a list of conversations and an open ticket with an internal note.",
  },
  help: {
    width: 1440,
    height: 900,
    alt: "The public help center: a search box and collections of articles.",
  },
} as const;

export type CaptureName = keyof typeof captures;

export function Capture({
  name,
  sizes,
  className,
  priority = false,
}: {
  name: CaptureName;
  /** How wide the image is shown, as for `sizes` on an image. */
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const { width, height, alt } = captures[name];
  const picture = (scheme: "light" | "dark", themeClass: string) => (
    <picture className={themeClass}>
      <source srcSet={`/captures/${name}-${scheme}.avif`} type="image/avif" sizes={sizes} />
      <img
        src={`/captures/${name}-${scheme}.webp`}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="block h-auto w-full"
      />
    </picture>
  );
  return (
    <div className={className}>
      {picture("light", "block dark:hidden")}
      {picture("dark", "hidden dark:block")}
    </div>
  );
}
