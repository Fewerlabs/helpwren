"use client";

import { useRef, useState, type ReactElement, type ReactNode } from "react";

import { cn } from "#lib/cn";

import { Button } from "../button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog/dialog";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/registry";

export type ConfirmTone = "default" | "destructive";

export interface ConfirmDialogProps {
  /** The question, such as "Delete this conversation?". */
  title: ReactNode;
  /** What will happen, and whether it can be undone. */
  description?: ReactNode;
  /** Anything more to show or ask under the description, such as a checkbox or a note field. */
  children?: ReactNode;
  /** Say what the button does ("Delete", "Resolve"), not "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` is for what cannot be undone: the button turns red and Cancel is focused. */
  tone?: ConfirmTone;
  /** Shown beside the title, in the tone's colour. */
  icon?: IconName;
  /** Blocks the confirm button, for example until a checkbox is ticked. */
  confirmDisabled?: boolean;
  /**
   * Called when the person confirms. If it returns a promise, the button shows its loading
   * state until it settles; the dialog closes when it resolves, and stays open with an error
   * line when it rejects.
   */
  onConfirm?: () => unknown;
  /** Called when the person backs out: Cancel, Escape, or the trigger's dialog being dismissed. */
  onCancel?: () => void;
  /**
   * The error line after `onConfirm` rejects. By default the rejection's own message when it
   * is an `Error` with one, so reject with words meant for the person.
   */
  errorMessage?: ReactNode | ((error: unknown) => ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The element that opens the dialog, usually a `Button`. Leave it out to control `open`. */
  trigger?: ReactElement;
  className?: string;
}

const FALLBACK_ERROR = "That did not work. Try again.";

function describeError(error: unknown, errorMessage: ConfirmDialogProps["errorMessage"]) {
  if (typeof errorMessage === "function") return errorMessage(error);
  if (errorMessage !== undefined) return errorMessage;
  return error instanceof Error && error.message !== "" ? error.message : FALLBACK_ERROR;
}

/**
 * Asks the person to confirm an action before it happens. Use it for what cannot be undone, or
 * what other people will notice. For a quick yes or no from code, `useConfirm` opens one
 * without any markup.
 */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  icon,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  errorMessage,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  trigger,
  className,
}: ConfirmDialogProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = controlledOpen ?? ownOpen;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ReactNode>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // A failure belongs to one attempt: it is gone the next time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }

  function setOpen(next: boolean) {
    setOwnOpen(next);
    onOpenChange?.(next);
  }

  function cancel() {
    // While the action runs there is nothing to back out of.
    if (pending) return;
    setOpen(false);
    onCancel?.();
  }

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      await onConfirm?.();
      setOpen(false);
    } catch (caught) {
      setError(describeError(caught, errorMessage));
    } finally {
      setPending(false);
    }
  }

  const destructive = tone === "destructive";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else cancel();
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        // It interrupts for an answer, which is what tells a screen reader to read it at once.
        role="alertdialog"
        hideClose
        className={cn("gap-5", className)}
        // Without a description Radix would point at one that is not there.
        {...(description === undefined ? { "aria-describedby": undefined } : {})}
        // A click outside is not an answer, so it must not count as "no".
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // Enter must never destroy something by accident, so the safe choice gets the focus.
          const first = destructive || confirmDisabled ? cancelRef : confirmRef;
          first.current?.focus();
        }}
      >
        <div className="flex gap-3.5">
          {icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                destructive ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
              )}
            >
              <Icon name={icon} className="size-5" />
            </span>
          ) : null}
          <DialogHeader className="min-w-0 flex-1">
            <DialogTitle className="pr-0">{title}</DialogTitle>
            {description === undefined ? null : (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        </div>
        {children}
        {error === null ? null : (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button ref={cancelRef} variant="secondary" disabled={pending} onClick={cancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? "destructive" : "primary"}
            loading={pending}
            disabled={confirmDisabled}
            onClick={() => {
              void confirm();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
