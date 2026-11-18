"use client";

import { isImage, type Attachment } from "@helpwren/core";
import { cn, Icon, Skeleton } from "@helpwren/design-system";

import { formatBytes } from "@/lib/format-bytes";

import { useAttachmentUrls } from "../hooks/use-thread";

export interface MessageAttachmentsProps {
  attachments: readonly Attachment[];
  /** Smaller pictures and text, for the inbox. */
  compact?: boolean;
}

/**
 * The files sent with a message. A picture is shown, and opens full size in a new tab; any
 * other file is a link with its name and size.
 */
export function MessageAttachments({ attachments, compact = false }: MessageAttachmentsProps) {
  const urls = useAttachmentUrls(attachments);

  return (
    <>
      {attachments.map((attachment) => {
        const url = urls.data?.[attachment.path];
        const label = `${attachment.name}, ${formatBytes(attachment.size)}`;

        if (isImage(attachment)) {
          return url ? (
            <a
              key={attachment.path}
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${label}`}
              className="focus-visible:outline-ring block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed link to private storage, which the optimiser could not fetch */}
              <img
                src={url}
                alt={attachment.name}
                className={cn("bg-muted w-auto object-cover", compact ? "max-h-44" : "max-h-56")}
              />
            </a>
          ) : (
            <Skeleton
              key={attachment.path}
              aria-label={`Loading ${attachment.name}`}
              className={cn("w-40 rounded-xl", compact ? "h-28" : "h-32")}
            />
          );
        }

        return (
          <a
            key={attachment.path}
            // Without a link yet there is nowhere to go; it arrives a moment after the message.
            {...(url
              ? { href: url, target: "_blank", rel: "noreferrer", download: attachment.name }
              : {})}
            className={cn(
              "border-rule bg-card hover:bg-muted focus-visible:outline-ring flex max-w-full items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              compact ? "text-xs" : "text-sm",
            )}
          >
            <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg">
              <Icon name="paperclip" className="size-4" />
            </span>
            <span className="grid min-w-0">
              <span className="truncate font-medium">{attachment.name}</span>
              <span className="text-muted-foreground text-xs">{formatBytes(attachment.size)}</span>
            </span>
          </a>
        );
      })}
    </>
  );
}
