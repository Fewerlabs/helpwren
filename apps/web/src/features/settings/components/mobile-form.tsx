"use client";

import {
  Badge,
  Button,
  CodeSnippet,
  FieldList,
  toast,
  useConfirm,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { removeExpoAccessToken, saveMobile } from "../actions";
import { mobileSchema, type MobileValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

export interface MobileFormProps {
  provider: MobileValues["provider"];
  /** Whether an Expo access token is saved. Its value never reaches the browser. */
  hasAccessToken: boolean;
  /** Whether the server has the secret its scheduler uses, without which nothing is sent. */
  scheduled: boolean;
  /** This install's address, for the code samples. */
  origin: string;
  canEdit: boolean;
}

const providerOptions = [
  { value: "none", label: "No push notifications" },
  { value: "expo", label: "Expo" },
] as const;

function appSample(origin: string): string {
  return [
    'import * as Notifications from "expo-notifications";',
    "import {",
    "  registerSupportDevice,",
    "  supportConversationId,",
    "  unregisterSupportDevice,",
    '} from "@helpwren/react-native";',
    "",
    "// When the app starts with someone logged in, and when the push token changes:",
    "await registerSupportDevice({",
    `  baseUrl: "${origin}",`,
    "  pushToken: (await Notifications.getExpoPushTokenAsync({ projectId })).data,",
    '  platform: Platform.OS === "ios" ? "ios" : "android",',
    '  source: "customer_app",',
    "  token: await auth.getAccessToken(),",
    "});",
    "",
    "// When a notification is tapped:",
    "Notifications.addNotificationResponseReceivedListener((response) => {",
    "  const conversationId = supportConversationId(response.notification.request.content.data);",
    '  if (conversationId) navigation.navigate("Support", { conversationId });',
    "});",
    "",
    "// On logout:",
    `await unregisterSupportDevice({ baseUrl: "${origin}", pushToken });`,
  ].join("\n");
}

/** How the install reaches people on their phones when your team replies. */
export function MobileForm({
  provider,
  hasAccessToken,
  scheduled,
  origin,
  canEdit,
}: MobileFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saved, setSaved] = useState(false);
  const form = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { provider, accessToken: "" },
  });
  const chosen = useWatch({ control: form.control, name: "provider" });
  const disabled = !canEdit || form.formState.isSubmitting;

  const providerFields: FieldItem<MobileValues>[] = [
    {
      name: "provider",
      label: "Send pushes through",
      type: "radio",
      hint: "For apps built with Expo. Pushes go out a few seconds after a reply, unless it was read in the chat by then.",
      props: { options: providerOptions },
    },
  ];
  const tokenFields: FieldItem<MobileValues>[] = [
    {
      name: "accessToken",
      label: hasAccessToken ? "Replace the access token" : "Access token",
      type: "input",
      hint: "Needed only when your Expo project has enhanced push security on. Make one under Access tokens in your Expo account.",
      props: {
        type: "password",
        autoComplete: "off",
        placeholder: hasAccessToken ? "Leave empty to keep the saved token" : "",
      },
    },
  ];

  async function save(values: MobileValues) {
    setSaved(false);
    try {
      const result = await saveMobile(values);
      if (result.ok) {
        form.reset({ ...values, accessToken: "" });
        setSaved(true);
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  function removeToken() {
    void confirm({
      tone: "destructive",
      icon: "trash",
      title: "Remove the access token?",
      description:
        "If your Expo project has enhanced push security on, pushes stop until a new token is saved.",
      confirmLabel: "Remove token",
      onConfirm: async () => {
        const result = await removeExpoAccessToken();
        if (!result.ok) throw new Error(saveErrors[result.reason]);
        toast.success("Access token removed");
        router.refresh();
      },
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <SettingsSection
        title="Push notifications"
        description="A push to the person's phone when your team replies and they are not in the chat."
      >
        <FieldList control={form.control} fields={providerFields} disabled={disabled} />
      </SettingsSection>

      {chosen === "expo" ? (
        <SettingsSection
          title="Expo"
          description="Kept on the server, with the other secrets. It is never shown again once saved."
        >
          <div className="flex items-center gap-2">
            {hasAccessToken ? (
              <Badge variant="accent">Token saved</Badge>
            ) : (
              <Badge variant="outline">No token</Badge>
            )}
            {hasAccessToken && canEdit ? (
              <Button type="button" variant="ghost" size="sm" onClick={removeToken}>
                Remove
              </Button>
            ) : null}
          </div>
          <FieldList control={form.control} fields={tokenFields} disabled={disabled} />
        </SettingsSection>
      ) : null}

      {chosen === "expo" ? (
        <SettingsSection
          title="Sending"
          description="Pushes are sent by the same scheduled job as emails, every minute."
        >
          <div className="flex items-center gap-2">
            {scheduled ? (
              <Badge variant="accent">Scheduled</Badge>
            ) : (
              <Badge variant="outline">Not scheduled</Badge>
            )}
            <p className="text-muted-foreground text-xs">
              {scheduled
                ? "CRON_SECRET is set. Your scheduler calls /api/jobs/push every minute."
                : "Set CRON_SECRET on the server and have a scheduler call /api/jobs/push every minute."}
            </p>
          </div>
        </SettingsSection>
      ) : null}

      {chosen === "expo" ? (
        <SettingsSection
          title="In your app"
          description="Register the phone for its logged-in user, open the conversation when a notification is tapped, and stop on logout."
        >
          <CodeSnippet
            wrap
            tabs={[{ label: "React Native", language: "tsx", code: appSample(origin) }]}
            tabsLabel="Push in your app"
            copiedMessage="Code copied"
          />
        </SettingsSection>
      ) : null}

      {canEdit ? (
        <SaveBar
          saving={form.formState.isSubmitting}
          saved={saved}
          dirty={form.formState.isDirty}
          error={form.formState.errors.root?.message}
        />
      ) : null}
    </form>
  );
}
