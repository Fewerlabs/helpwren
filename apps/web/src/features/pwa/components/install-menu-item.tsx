"use client";

import { Icon } from "@helpwren/design-system";

import { useInstallPrompt } from "../install-prompt";

export interface InstallMenuItemProps {
  /** Closes the menu the row is in. */
  onSelect?: () => void;
}

/**
 * "Install app", as a row in the account menu, where the browser offers to install (Chrome and
 * Edge on a computer). Nothing anywhere else, or once installed.
 */
export function InstallMenuItem({ onSelect }: InstallMenuItemProps) {
  const { canPrompt, installed, install } = useInstallPrompt();
  if (!canPrompt || installed) return null;

  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.();
        void install();
      }}
      className="hover:bg-muted focus-visible:outline-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-2"
    >
      <Icon name="download-simple" className="size-4" />
      Install app
    </button>
  );
}
