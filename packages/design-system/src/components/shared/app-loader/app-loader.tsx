import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

export interface AppLoaderProps extends Omit<ComponentProps<"div">, "children"> {
  /** What is loading, shown under the drawing and announced: "Opening the article". */
  label?: string;
  /** How large the drawing is. `sm` fits a panel, `lg` a whole page. Default `md`. */
  size?: "sm" | "md" | "lg";
  /**
   * Leaves the wren out and draws only a line of handwriting. Use it on a screen that carries
   * someone else's brand, such as the visitor's chat or the help center.
   */
  bird?: boolean;
  /** Fills its container and sits in the middle of it. Default true. */
  fill?: boolean;
}

const widths = { sm: "w-14", md: "w-20", lg: "w-28" } as const;

/**
 * The loading state for a whole page, a panel or anything else that has nothing to show yet:
 * the wren draws itself on its twig, gives a small hop, and is drawn again for as long as the
 * wait lasts. Use `Skeleton` only where the shape of what is coming is known and helps, such
 * as rows of a list, and `Spinner` inside a button or beside a line of text.
 */
export function AppLoader({
  label = "Loading",
  size = "md",
  bird = true,
  fill = true,
  className,
  ...props
}: AppLoaderProps) {
  return (
    <div
      data-slot="app-loader"
      role="status"
      // A status is not named by what is inside it, so the words are given to it as its name too.
      aria-label={label}
      className={cn(
        "text-foreground flex flex-col items-center justify-center gap-3 p-6",
        fill && "size-full min-h-40",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 6 76 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn("h-auto", widths[size])}
      >
        {bird ? (
          <g className="hw-loader-hop">
            <path
              pathLength={1}
              className="hw-loader-line"
              d="M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z"
            />
            <path
              pathLength={1}
              data-part="detail"
              className="hw-loader-line"
              d="M28 34.5C30.5 41 38 44 45 39.5"
            />
            <path
              pathLength={1}
              data-part="detail"
              className="hw-loader-line"
              d="M35.5 50 35 57M41.5 49.5 42.5 57"
            />
            <circle
              cx="47.5"
              cy="28.2"
              r="1.5"
              fill="currentColor"
              stroke="none"
              className="hw-loader-eye"
            />
          </g>
        ) : (
          <path
            pathLength={1}
            className="hw-loader-line"
            d="M12 40C17 28 22 28 24 38 26 48 31 46 33 36 35 26 40 26 42 37 44 47 49 46 51 36 53 27 58 27 60 38 61 44 64 45 67 40"
          />
        )}
        {/* The twig it stands on: the brand's colour, drawn a touch unevenly, as by hand. */}
        <path
          pathLength={1}
          data-part={bird ? "detail" : undefined}
          className="hw-loader-line text-moss"
          d="M8 58.2C20 57 31 59.4 44 58 53 57.1 60 58.8 70 57.6"
        />
      </svg>
      <p aria-hidden="true" className="text-muted-foreground text-sm">
        {label}…
      </p>
    </div>
  );
}
