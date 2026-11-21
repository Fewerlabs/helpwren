"use client";

import { Button, FieldList, Icon, type FieldItem } from "@helpwren/design-system";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  currentPushSubscription,
  playSound,
  pushSupport,
  requestDesktopPermission,
  savePreferences,
  showDesktopAlert,
  turnOffPush,
  turnOnPush,
  useDesktopSupported,
  usePreferences,
  type Preferences,
  type PushSupport,
} from "@/features/notifications";

import { SettingsSection } from "./settings-frame";

const aboutOptions = [
  { value: "all", label: "Every conversation" },
  { value: "mine", label: "Only mine and unassigned ones" },
] as const;

/**
 * Whether this device gets notifications with Helpwren closed: `on` once subscribed to pushes,
 * `off` when only the open dashboard notifies, `failed` when subscribing did not work.
 */
type PushState = "checking" | "on" | "off" | "failed";

const never = () => () => undefined;

/**
 * How the signed-in team member hears about new messages on this device. Each change takes
 * effect at once and is kept in this browser; with desktop notifications on, the device is also
 * subscribed to pushes, so they arrive with Helpwren closed.
 */
export function NotificationForm() {
  const stored = usePreferences();
  const form = useForm<Preferences>({ values: stored });
  const [blocked, setBlocked] = useState(false);
  const [push, setPush] = useState<PushState>("checking");
  const asking = useRef(false);
  const supported = useDesktopSupported();
  const support = useSyncExternalStore<PushSupport>(never, pushSupport, () => "unsupported");

  const desktop = useWatch({ control: form.control, name: "desktop" });
  const sound = useWatch({ control: form.control, name: "sound" });
  const about = useWatch({ control: form.control, name: "about" });

  // Dirty only once the person has changed something, never while what is stored loads in.
  const { isDirty } = form.formState;

  useEffect(() => {
    if (support !== "supported") return;
    void currentPushSubscription().then(
      (subscription) => {
        setPush(subscription ? "on" : "off");
      },
      () => {
        setPush("off");
      },
    );
  }, [support]);

  /** Subscribes this device, and says how that went. */
  const subscribe = useCallback((topic: Preferences["about"]) => {
    if (pushSupport() !== "supported") return;
    void turnOnPush(topic).then(
      (done) => {
        setPush(done ? "on" : "failed");
      },
      () => {
        setPush("failed");
      },
    );
  }, []);

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
        const next = { ...form.getValues(), desktop: granted };
        savePreferences(next);
        if (granted) subscribe(next.about);
      });
      return;
    }
    if (!desktop && stored.desktop && pushSupport() === "supported") {
      void turnOffPush()
        .catch(() => undefined)
        .then(() => {
          setPush("off");
        });
    } else if (desktop && about !== stored.about) {
      subscribe(about);
    }
    savePreferences({ desktop, sound, about });
  }, [about, desktop, form, isDirty, sound, stored, subscribe]);

  const alertFields: FieldItem<Preferences>[] = [
    {
      name: "desktop",
      label: "Desktop notifications",
      type: "switch",
      hint: supported
        ? "When a message arrives and Helpwren isn't in view."
        : support === "needs-install"
          ? "On iPhone and iPad, add Helpwren to your Home Screen first."
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
        description="How you hear about new messages on this device. Set it on each device you use."
      >
        <FieldList control={form.control} fields={alertFields} />
        {stored.desktop && supported ? (
          <PushStatus state={support === "supported" ? push : "off"} />
        ) : null}
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
                void showDesktopAlert({
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

/** Whether notifications reach this device with Helpwren closed. */
function PushStatus({ state }: { state: PushState }) {
  if (state === "checking") return null;
  if (state === "failed") {
    return (
      <p role="alert" className="bg-muted rounded-lg px-3 py-2">
        Couldn&apos;t turn on notifications for when Helpwren is closed. Turn this off and on to try
        again.
      </p>
    );
  }
  const on = state === "on";
  return (
    <p role="status" className="text-muted-foreground flex items-center gap-2">
      <Icon name={on ? "check-circle" : "info"} className={on ? "text-primary size-4" : "size-4"} />
      {on
        ? "This device gets them even with Helpwren closed."
        : "This device gets them only while Helpwren is open."}
    </p>
  );
}
