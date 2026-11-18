"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";

/** What `confirm()` takes: everything about the dialog except how it is opened. */
export type ConfirmOptions = Omit<
  ConfirmDialogProps,
  "open" | "defaultOpen" | "onOpenChange" | "trigger" | "onCancel"
>;

/** Opens a confirmation and resolves to true if the person confirmed, false if they backed out. */
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Holds the one dialog that `useConfirm` opens. Mount it once, around the screen that asks.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  // The last question stays while the dialog closes, so its words do not vanish mid-animation.
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const answer = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    answer.current?.(confirmed);
    answer.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<Confirm>(
    (next) =>
      new Promise<boolean>((resolve) => {
        // A second question replaces the first, which counts as not confirmed.
        answer.current?.(false);
        answer.current = resolve;
        setOptions(next);
        setOpen(true);
      }),
    [],
  );

  // Nobody is left to answer once the provider is gone, so whoever is waiting hears "no".
  useEffect(
    () => () => {
      answer.current?.(false);
      answer.current = null;
    },
    [],
  );

  return (
    <ConfirmContext value={confirm}>
      {children}
      {options ? (
        <ConfirmDialog
          {...options}
          open={open}
          onOpenChange={(next) => {
            // Closing after a confirmation arrives here too; by then the answer is given.
            if (!next) settle(false);
          }}
          onConfirm={async () => {
            await options.onConfirm?.();
            settle(true);
          }}
        />
      ) : null}
    </ConfirmContext>
  );
}

/**
 * Asks for confirmation from code: `if (await confirm({ title: "Delete it?" })) { ... }`.
 * Pass `onConfirm` to keep the dialog open, with a spinner, while the action runs. Needs a
 * `ConfirmProvider` above.
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm needs a ConfirmProvider above it.");
  return confirm;
}
