import type { ComponentProps, ReactNode } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../../base/icon/icon";
import { type IconName } from "../../base/icon/registry";
import { focusRing } from "../../base/styles";

export interface ArticleCardProps extends Omit<ComponentProps<"a">, "title" | "children"> {
  href: string;
  title: ReactNode;
  /** One or two sentences on what the article covers. */
  summary?: ReactNode;
  /** A short mono label above the title, such as the category. */
  category?: ReactNode;
  /** A line under the summary, such as "Updated 3 days ago". */
  meta?: ReactNode;
  /** An icon in a tile above the title, for a card that stands for a whole collection. */
  icon?: IconName;
}

/** A help article, or a collection of them, in a list or grid. The whole card is one link. */
export function ArticleCard({
  href,
  title,
  summary,
  category,
  meta,
  icon,
  className,
  ...props
}: ArticleCardProps) {
  return (
    <a
      href={href}
      data-slot="article-card"
      className={cn(
        "group border-line border-border bg-card hover:border-foreground flex flex-col gap-1.5 rounded-2xl p-5 transition-colors",
        focusRing,
        className,
      )}
      {...props}
    >
      {icon === undefined ? null : (
        <span className="bg-primary/10 text-primary mb-2 grid size-10 place-items-center rounded-xl">
          <Icon name={icon} weight="duotone" className="size-5" />
        </span>
      )}
      {category === undefined ? null : (
        <span className="text-muted-foreground text-2xs font-mono tracking-wide uppercase">
          {category}
        </span>
      )}
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold text-balance">{title}</span>
        <Icon
          name="arrow-right"
          className="text-muted-foreground group-hover:text-foreground mt-1 size-4 transition-transform group-hover:translate-x-0.5"
        />
      </span>
      {summary === undefined ? null : (
        <span className="text-muted-foreground line-clamp-3 text-sm">{summary}</span>
      )}
      {meta === undefined ? null : (
        <span className="text-muted-foreground mt-1 text-xs">{meta}</span>
      )}
    </a>
  );
}
