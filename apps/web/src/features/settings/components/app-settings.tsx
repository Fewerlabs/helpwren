"use client";

import { Button, Icon } from "@helpwren/design-system";
import { useState, useSyncExternalStore } from "react";

import { applyUpdate, checkForUpdate, currentPlatform, useInstallPrompt } from "@/features/pwa";

import { SettingsSection } from "./settings-frame";

export interface AppSettingsProps {
  /** The build this page was loaded from, such as `0.1.0+3f2a9c1`. */
  version: string;
}

type Check = "idle" | "checking" | "current" | "ready" | "failed";

const never = () => () => undefined;

/** The version this browser runs, a way to look for a newer one, and installing the app. */
export function AppSettings({ version }: AppSettingsProps) {
  const [check, setCheck] = useState<Check>("idle");
  const { canPrompt, installed, install } = useInstallPrompt();
  const ios = useSyncExternalStore(
    never,
    () => currentPlatform() === "ios",
    () => false,
  );

  return (
    <>
      <SettingsSection title="Version" description="The version open in this browser.">
        <p className="font-mono" data-testid="app-version">
          {version}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {check === "ready" ? (
            <Button size="sm" onClick={applyUpdate}>
              <Icon name="arrows-clockwise" />
              Update
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={check === "checking"}
              onClick={() => {
                setCheck("checking");
                checkForUpdate().then(setCheck, () => {
                  setCheck("failed");
                });
              }}
            >
              Check for updates
            </Button>
          )}
          <p role="status" className="text-muted-foreground">
            {check === "current" ? "You're on the latest version." : null}
            {check === "ready" ? "A new version is ready." : null}
            {check === "failed" ? "Couldn't check. Try again in a moment." : null}
          </p>
        </div>
      </SettingsSection>
      <SettingsSection
        title="Install"
        description="Open Helpwren in its own window, from your home screen or dock."
      >
        {installed ? (
          <p className="flex items-center gap-2">
            <Icon name="check-circle" className="text-primary size-4" />
            Installed
          </p>
        ) : canPrompt ? (
          <div>
            <Button
              size="sm"
              onClick={() => {
                void install();
              }}
            >
              <Icon name="download-simple" />
              Install
            </Button>
          </div>
        ) : ios ? (
          <p>
            In Safari, tap{" "}
            <Icon name="export" label="Share" className="inline size-4 align-text-bottom" /> Share,
            then Add to Home Screen.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Not installed. Use Install in your browser&apos;s menu where it offers one.
          </p>
        )}
      </SettingsSection>
    </>
  );
}
