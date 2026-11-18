"use client";

import { Button, FieldList, type FieldItem } from "@helpwren/design-system";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  playSound,
  requestDesktopPermission,
  savePreferences,
  showDesktopAlert,
  useDesktopSupported,
  usePreferences,
  type Preferences,
} from "@/features/notifications";

import { SettingsSection } from "./settings-frame";

const aboutOptions = [
  { value: "all", label: "Every conversation" },
  { value: "mine", label: "Only mine and unassigned ones" },
] as const;

/**
 * How the signed-in team member hears about new messages. Each change takes effect at once and
 * is kept in this browser.
 */
export function NotificationForm() {
  const stored = usePreferences();
  const form = useForm<Preferences>({ values: stored });
  const [blocked, setBlocked] = useState(false);
  const asking = useRef(false);
  const supported = useDesktopSupported();

  const desktop = useWatch({ control: form.control, name: "desktop" });
  const sound = useWatch({ control: form.control, name: "sound" });
  const about = useWatch({ control: form.control, name: "about" });

  // Dirty only once the person has changed something, never while what is stored loads in.
  const { isDirty } = form.formState;

  // Each change is kept as it is made; there is nothing to save at the end.
  useEffect(() => {
    if (!isDirty) return;
    if (desktop && !stored.desktop) {
      if (asking.current) return;
      asking.current = true;
      // The browser asks the person; unless they say yes the switch goes back to off.
      void requestDesktopPermission().then((granted) => {
        asking.current = false;
        setBlocked(!granted);
        if (!granted) form.setValue("desktop", false);
        // Whatever else was changed while the browser was asking is kept too.
        savePreferences({ ...form.getValues(), desktop: granted });
      });
      return;
    }
    savePreferences({ desktop, sound, about });
  }, [about, desktop, form, isDirty, sound, stored]);

  const alertFields: FieldItem<Preferences>[] = [
    {
      name: "desktop",
      label: "Desktop notifications",
      type: "switch",
      hint: supported
        ? "Shown by your browser when a message arrives and this tab is not in view."
        : "This browser cannot show notifications.",
      props: { disabled: !supported },
    },
    {
      name: "sound",
      label: "Sound",
      type: "switch",
      hint: "A short sound when a message arrives.",
    },
  ];
  const aboutFields: FieldItem<Preferences>[] = [
    { name: "about", label: "Notify me about", type: "radio", props: { options: aboutOptions } },
  ];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <SettingsSection
        title="New messages"
        description="How you hear about a message while the dashboard is open. Kept on this browser, so set it on each device you use."
      >
        <FieldList control={form.control} fields={alertFields} />
        {blocked ? (
          <p role="alert" className="bg-muted rounded-lg px-3 py-2">
            Your browser is blocking notifications from this site. Allow them in the browser&apos;s
            site settings, then turn this on again.
          </p>
        ) : null}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!stored.desktop && !stored.sound}
            onClick={() => {
              if (stored.sound) playSound();
              if (stored.desktop) {
                showDesktopAlert({
                  title: "New message",
                  body: "This is what a notification looks like.",
                  tag: "helpwren-test",
                });
              }
            }}
          >
            Send a test
          </Button>
        </div>
      </SettingsSection>
      <SettingsSection
        title="Which conversations"
        description="Leave out conversations a teammate has taken, if you only want your own."
      >
        <FieldList control={form.control} fields={aboutFields} />
      </SettingsSection>
    </form>
  );
}
