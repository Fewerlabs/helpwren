import type { ComponentProps } from "react";

import {
  Dialog as UiDialog,
  DialogClose as UiDialogClose,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
  DialogTrigger as UiDialogTrigger,
} from "#components/ui/dialog";
import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";

export type DialogProps = ComponentProps<typeof UiDialog>;

export interface DialogContentProps extends Omit<
  ComponentProps<typeof UiDialogContent>,
  "showCloseButton"
> {
  /** The accessible name of the close button. */
  closeLabel?: string;
  /** Hides the close button. The dialog must then offer another way to close. */
  hideClose?: boolean;
  /** Fills the screen, for something that needs all the room there is, such as a preview. */
  fullScreen?: boolean;
}

/** A modal window that interrupts the page for a decision or a short task. */
export const Dialog = UiDialog;
export const DialogTrigger = UiDialogTrigger;
export const DialogClose = UiDialogClose;
export const DialogHeader = UiDialogHeader;
export const DialogDescription = UiDialogDescription;

export function DialogContent({
  closeLabel = "Close",
  hideClose = false,
  fullScreen = false,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <UiDialogContent
      showCloseButton={false}
      className={cn(
        "border-rule rounded-2xl border p-6 ring-0 sm:max-w-md",
        fullScreen &&
          "inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 p-4 sm:max-w-none",
        className,
      )}
      {...props}
    >
      {children}
      {hideClose ? null : (
        <UiDialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={closeLabel}
            className="absolute top-3 right-3"
          >
            <Icon name="x" />
          </Button>
        </UiDialogClose>
      )}
    </UiDialogContent>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof UiDialogTitle>) {
  return (
    <UiDialogTitle
      className={cn("pr-8 text-lg leading-snug font-semibold", className)}
      {...props}
    />
  );
}

/** The row of actions at the bottom. Put the primary action last. */
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
