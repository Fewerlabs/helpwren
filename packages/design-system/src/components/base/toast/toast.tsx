"use client";

import type { ReactNode } from "react";
import { toast as sonner } from "sonner";

import { Toaster as UiToaster } from "#components/ui/sonner";
import { cn } from "#lib/cn";

import { focusRing } from "../styles";

export type ToastPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface ToasterProps {
  /** The corner the toasts appear in. */
  position?: ToastPosition;
  /** How long a toast stays, in milliseconds, unless it sets its own. */
  duration?: number;
  /** Shows every toast in full, in place of a stack that opens when hovered. */
  expand?: boolean;
  /** How many toasts show at once. Older ones wait behind. */
  visibleToasts?: number;
  /** Names the region for assistive technology. */
  label?: string;
  className?: string;
}

// Sonner's stylesheet is not in a cascade layer, so it wins over our utilities wherever both
// set the same property on the same element. Those few places are marked important (`!`).
const toastClassNames = {
  toast: cn(
    "bg-card text-card-foreground border-rule flex items-start gap-2.5 rounded-xl border px-3.5 py-3 font-sans text-[0.8125rem] leading-5",
    // As wide as its words, up to the stack's width, and kept to the side of the screen it
    // belongs to: centred in a centred stack, against the edge in a corner.
    "inset-x-0! mx-auto w-fit max-w-(--width) data-[x-position=left]:ml-0 data-[x-position=right]:mr-0",
    "focus-visible:outline-ring! focus-visible:[box-shadow:none]! focus-visible:outline-2! focus-visible:outline-offset-2!",
    // In a closed stack only the front toast is read; the ones behind show as bare cards.
    "data-[expanded=false]:data-[front=false]:*:opacity-0",
  ),
  icon: "relative mt-0.5 flex size-4 shrink-0 items-center justify-center",
  content: "flex min-w-0 flex-1 flex-col gap-0.5",
  title: "font-medium",
  description: "text-muted-foreground",
  actionButton: cn(
    "border-line border-border bg-card text-foreground hover:bg-muted h-7 shrink-0 cursor-pointer self-center rounded-lg px-2.5 text-xs font-medium transition-colors",
    focusRing,
  ),
  success: "[&_[data-icon]]:text-primary",
  error: "[&_[data-icon]]:text-destructive",
  warning: "[&_[data-icon]]:text-ochre",
  info: "[&_[data-icon]]:text-biro",
  loading: "[&_[data-icon]]:text-muted-foreground",
};

/**
 * Where toasts appear. Mount it once, near the root of the screen that uses `toast`. It draws
 * with the theme's colours, so it follows light and dark mode with the page around it.
 */
export function Toaster({
  position = "bottom-right",
  duration,
  expand = false,
  visibleToasts,
  label = "Notifications",
  className,
}: ToasterProps) {
  return (
    <UiToaster
      position={position}
      expand={expand}
      containerAriaLabel={label}
      // Closer to the corner and to each other than Sonner's defaults, to suit a dense screen.
      gap={8}
      offset={16}
      {...(duration === undefined ? {} : { duration })}
      {...(visibleToasts === undefined ? {} : { visibleToasts })}
      {...(className === undefined ? {} : { className })}
      toastOptions={{ unstyled: true, classNames: toastClassNames }}
    />
  );
}

export type ToastId = string | number;

export interface ToastAction {
  label: string;
  /** The toast closes after this runs. */
  onClick: () => void;
}

export interface ToastOptions {
  /** A second, quieter line under the message. */
  description?: ReactNode;
  /** One button beside the message, such as "Undo". */
  action?: ToastAction;
  /** How long it stays, in milliseconds. `Infinity` keeps it until dismissed. */
  duration?: number;
  /** A toast shown with the id of one on screen replaces it, in place of adding another. */
  id?: ToastId;
}

export interface ToastPromiseMessages<Value> {
  loading: ReactNode;
  success: ReactNode | ((value: Value) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}

/**
 * Tells the person something happened, without interrupting them. It needs a `Toaster` on the
 * page. Each call returns the toast's id, which `dismiss` takes.
 */
export const toast = {
  /** A plain message, with no icon. */
  message: (message: ReactNode, options?: ToastOptions): ToastId =>
    sonner.message(message, options),
  /** Something worked. */
  success: (message: ReactNode, options?: ToastOptions): ToastId =>
    sonner.success(message, options),
  /** Something failed. Say what, and what to do about it. */
  error: (message: ReactNode, options?: ToastOptions): ToastId => sonner.error(message, options),
  /** One toast that follows a promise: a spinner while it runs, then how it ended. */
  promise: <Value,>(promise: Promise<Value>, messages: ToastPromiseMessages<Value>): void => {
    sonner.promise(promise, messages);
  },
  /** Closes one toast, or all of them when no id is given. */
  dismiss: (id?: ToastId): void => {
    sonner.dismiss(id);
  },
};
