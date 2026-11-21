"use client";

import { Button, Card, Icon, Logo } from "@helpwren/design-system";
import { useState, useSyncExternalStore } from "react";

import { useMediaQuery } from "@/lib/use-media-query";

import { useInstallPrompt } from "../install-prompt";
import {
  currentPlatform,
  installOffer,
  PHONE_QUERY,
  rememberDismissal,
  wasDismissed,
  type Platform,
} from "../platform";

const never = () => () => undefined;

/**
 * Asks a team member on a phone to put the dashboard on their home screen: with the browser's
 * own install dialog where there is one (Chrome on Android), or the steps where there is not
 * (Safari on iPhone). "Not now" keeps it away for a month. Never shown on a larger screen.
 */
export function InstallBanner() {
  const phone = useMediaQuery(PHONE_QUERY);
  const { canPrompt, installed, install } = useInstallPrompt();
  const platform = useSyncExternalStore<Platform | null>(never, currentPlatform, () => null);
  const storedDismissal = useSyncExternalStore(never, wasDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);

  const offer = platform
    ? installOffer({
        platform,
        standalone: installed,
        phone,
        canPrompt,
        dismissed: dismissed || storedDismissal,
      })
    : null;
  if (!offer) return null;

  const close = () => {
    rememberDismissal();
    setDismissed(true);
  };

  return (
    // Above the bottom bar, clear of the home indicator.
    <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40">
      <Card
        role="region"
        aria-label="Install the app"
        className="flex-row items-start gap-3 p-3 shadow-lg"
      >
        <Logo variant="mark" size={28} label="" className="text-primary mt-0.5 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="grid gap-0.5">
            <p className="font-medium">Install the app</p>
            {offer === "prompt" ? (
              <p className="text-muted-foreground">Open the inbox from your home screen.</p>
            ) : (
              <p className="text-muted-foreground">
                Tap{" "}
                <Icon name="export" className="text-foreground inline size-4 align-text-bottom" />{" "}
                Share, then{" "}
                <span className="text-foreground whitespace-nowrap">
                  <Icon name="plus-square" className="inline size-4 align-text-bottom" /> Add to
                  Home Screen
                </span>
                .
              </p>
            )}
          </div>
          {offer === "prompt" ? (
            <div>
              <Button
                size="sm"
                onClick={() => {
                  void install().then((accepted) => {
                    if (!accepted) close();
                  });
                }}
              >
                <Icon name="download-simple" />
                Install
              </Button>
            </div>
          ) : null}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Not now" onClick={close}>
          <Icon name="x" />
        </Button>
      </Card>
    </div>
  );
}
