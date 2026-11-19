"use client";

import {
  Badge,
  Button,
  CodeSnippet,
  FieldList,
  toast,
  useConfirm,
  type CodeSnippetTab,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  makeWebhookSecret,
  removePushSecret,
  saveMobile,
  testWebhook,
  type PushSecret,
} from "../actions";
import { mobileSchema, type MobileValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

export interface MobileFormProps {
  channels: { expo: boolean; fcm: boolean; webhookUrl: string | null };
  /** Which secrets are saved. Their values never reach the browser. */
  secrets: {
    expoAccessToken: boolean;
    serviceAccount: { projectId: string; clientEmail: string } | null;
    webhookSecret: boolean;
  };
  /** Whether the server has the secret its scheduler uses, without which nothing is sent. */
  scheduled: boolean;
  /** This install's address, for the code samples. */
  origin: string;
  canEdit: boolean;
}

function appTabs(origin: string): CodeSnippetTab[] {
  const register = (provider: string, pushToken: string) =>
    [
      "await registerSupportDevice({",
      `  baseUrl: "${origin}",`,
      `  pushToken: ${pushToken},`,
      ...(provider === "fcm" ? ['  provider: "fcm",'] : []),
      '  platform: Platform.OS === "ios" ? "ios" : "android",',
      '  source: "customer_app",',
      "  token: await auth.getAccessToken(),",
      "});",
    ].join("\n");
  return [
    {
      label: "Expo",
      language: "tsx",
      code: [
        'import * as Notifications from "expo-notifications";',
        'import { registerSupportDevice, supportConversationId } from "@helpwren/react-native";',
        "",
        "// When the app starts with someone logged in, and when the push token changes:",
        register("expo", "(await Notifications.getExpoPushTokenAsync({ projectId })).data"),
        "",
        "// When a notification is tapped:",
        "Notifications.addNotificationResponseReceivedListener((response) => {",
        "  const id = supportConversationId(response.notification.request.content.data);",
        '  if (id) navigation.navigate("Support", { conversationId: id });',
        "});",
      ].join("\n"),
    },
    {
      label: "React Native Firebase",
      language: "tsx",
      code: [
        'import messaging from "@react-native-firebase/messaging";',
        'import { registerSupportDevice, supportConversationId } from "@helpwren/react-native";',
        "",
        "// When the app starts with someone logged in, and when the token is refreshed:",
        register("fcm", "await messaging().getToken()"),
        "",
        "// When a notification is tapped:",
        "messaging().onNotificationOpenedApp((message) => {",
        "  const id = supportConversationId(message.data);",
        '  if (id) navigation.navigate("Support", { conversationId: id });',
        "});",
      ].join("\n"),
    },
  ];
}

const verifySample = [
  'import { createHmac, timingSafeEqual } from "node:crypto";',
  "",
  "// `body` is the request body as received, before parsing.",
  "function fromHelpwren(body, header, secret) {",
  '  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=")));',
  "  const age = Math.abs(Date.now() / 1000 - Number(parts.t));",
  "  if (!parts.v1 || age > 300) return false; // older than five minutes: a replay",
  '  const expected = createHmac("sha256", secret).update(`${parts.t}.${body}`).digest();',
  '  const given = Buffer.from(parts.v1, "hex");',
  "  return given.length === expected.length && timingSafeEqual(given, expected);",
  "}",
  "",
  'if (!fromHelpwren(rawBody, request.headers["helpwren-signature"], SECRET)) return 401;',
  "const { type, contact, conversationId, title, preview, unreadCount } = JSON.parse(rawBody);",
].join("\n");

/** How the install reaches people on their phones when your team replies. */
export function MobileForm({ channels, secrets, scheduled, origin, canEdit }: MobileFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saved, setSaved] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [testing, setTesting] = useState(false);
  const form = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: {
      expo: channels.expo,
      fcm: channels.fcm,
      webhook: channels.webhookUrl !== null,
      webhookUrl: channels.webhookUrl ?? "",
      accessToken: "",
      serviceAccount: "",
    },
  });
  const [expo, fcm, webhook] = useWatch({
    control: form.control,
    name: ["expo", "fcm", "webhook"],
  });
  const disabled = !canEdit || form.formState.isSubmitting;
  const hasWebhookSecret = secrets.webhookSecret || newSecret !== null;

  const channelFields: FieldItem<MobileValues>[] = [
    {
      name: "expo",
      label: "Expo",
      type: "switch",
      hint: "For apps built with Expo, using Expo push tokens.",
    },
    {
      name: "fcm",
      label: "Firebase Cloud Messaging",
      type: "switch",
      hint: "For native Android and iOS apps, Flutter, and React Native Firebase.",
    },
    {
      name: "webhook",
      label: "Your own backend",
      type: "switch",
      hint: "A signed request to your server for each push, to send it your own way.",
    },
  ];
  const expoFields: FieldItem<MobileValues>[] = [
    {
      name: "accessToken",
      label: secrets.expoAccessToken ? "Replace the access token" : "Access token",
      type: "input",
      hint: "Needed only when your Expo project has enhanced push security on.",
      props: {
        type: "password",
        autoComplete: "off",
        placeholder: secrets.expoAccessToken ? "Leave empty to keep the saved token" : "",
      },
    },
  ];
  const fcmFields: FieldItem<MobileValues>[] = [
    {
      name: "serviceAccount",
      label: secrets.serviceAccount ? "Replace the key file" : "Service account key file",
      type: "textarea",
      hint: "In Firebase: Project settings, Service accounts, Generate new private key. Paste the whole file. One key file covers Android and iOS.",
      props: {
        rows: 4,
        className: "font-mono",
        autoComplete: "off",
        spellCheck: false,
        placeholder: secrets.serviceAccount ? "Leave empty to keep the saved key file" : "{ … }",
      },
    },
  ];
  const webhookFields: FieldItem<MobileValues>[] = [
    {
      name: "webhookUrl",
      label: "Address",
      type: "input",
      hint: "Your server's address for these requests. It answers with any 2xx when it has taken one.",
      props: {
        type: "url",
        autoCapitalize: "none",
        placeholder: "https://api.example.com/helpwren/push",
      },
    },
  ];

  async function save(values: MobileValues) {
    setSaved(false);
    try {
      const result = await saveMobile(values);
      if (result.ok) {
        form.reset({ ...values, accessToken: "", serviceAccount: "" });
        setSaved(true);
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  function remove(secret: PushSecret, title: string, description: string) {
    void confirm({
      tone: "destructive",
      icon: "trash",
      title,
      description,
      confirmLabel: "Remove",
      onConfirm: async () => {
        const result = await removePushSecret(secret);
        if (!result.ok) throw new Error(saveErrors[result.reason]);
        toast.success("Removed");
        router.refresh();
      },
    });
  }

  async function makeSecret() {
    setMaking(true);
    try {
      const result = await makeWebhookSecret();
      if (result.ok) {
        setNewSecret(result.secret);
        router.refresh();
      } else {
        toast.error(saveErrors.forbidden);
      }
    } catch {
      toast.error("The secret could not be made. Try again.");
    } finally {
      setMaking(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const result = await testWebhook(form.getValues("webhookUrl"));
      if (result.ok) toast.success("Your backend took the test");
      else toast.error(result.detail);
    } catch {
      toast.error("The test could not be sent. Try again.");
    } finally {
      setTesting(false);
    }
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
        description="A push to the person's phone when your team replies and they have not read it in the chat. Each phone is reached through the service its app uses."
      >
        <FieldList control={form.control} fields={channelFields} disabled={disabled} />
      </SettingsSection>

      {expo ? (
        <SettingsSection
          title="Expo"
          description="Kept on the server with the other secrets, and never shown again."
        >
          <div className="flex items-center gap-2">
            {secrets.expoAccessToken ? (
              <Badge variant="accent">Token saved</Badge>
            ) : (
              <Badge variant="outline">No token</Badge>
            )}
            {secrets.expoAccessToken && canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Remove the Expo access token"
                onClick={() => {
                  remove(
                    "expoAccessToken",
                    "Remove the access token?",
                    "If your Expo project has enhanced push security on, pushes to Expo apps stop until a new token is saved.",
                  );
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <FieldList control={form.control} fields={expoFields} disabled={disabled} />
        </SettingsSection>
      ) : null}

      {fcm ? (
        <SettingsSection
          title="Firebase"
          description="The key file is kept on the server with the other secrets. Only its project and account are shown again."
        >
          <div className="flex flex-wrap items-center gap-2">
            {secrets.serviceAccount ? (
              <>
                <Badge variant="accent">Key file saved</Badge>
                <span className="text-muted-foreground text-xs">
                  {secrets.serviceAccount.projectId} · {secrets.serviceAccount.clientEmail}
                </span>
              </>
            ) : (
              <Badge variant="outline">No key file</Badge>
            )}
            {secrets.serviceAccount && canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Remove the Firebase key file"
                onClick={() => {
                  remove(
                    "serviceAccount",
                    "Remove the key file?",
                    "Pushes to Firebase apps stop until a new key file is saved.",
                  );
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <FieldList control={form.control} fields={fcmFields} disabled={disabled} />
        </SettingsSection>
      ) : null}

      {webhook ? (
        <SettingsSection
          title="Your own backend"
          description="Each push is posted to your server as JSON, signed with this install's secret so your server can tell it is real."
        >
          <FieldList control={form.control} fields={webhookFields} disabled={disabled} />
          <div className="flex flex-wrap items-center gap-2">
            {hasWebhookSecret ? (
              <Badge variant="accent">Signing secret saved</Badge>
            ) : (
              <Badge variant="outline">No signing secret</Badge>
            )}
          </div>
          {newSecret ? (
            <div role="status" className="grid gap-2">
              <p className="font-medium">
                Copy the signing secret now. It will not be shown again.
              </p>
              <CodeSnippet
                variant="inline"
                aria-label="Webhook signing secret"
                code={newSecret}
                copyLabel="Copy secret"
                copiedLabel="Secret copied"
                copiedMessage="Secret copied"
              />
            </div>
          ) : null}
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={making}
                onClick={() => {
                  void makeSecret();
                }}
              >
                {hasWebhookSecret ? "Make a new signing secret" : "Make a signing secret"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={testing}
                disabled={!hasWebhookSecret}
                onClick={() => {
                  void sendTest();
                }}
              >
                Send a test
              </Button>
            </div>
          ) : null}
          <CodeSnippet
            wrap
            tabs={[{ label: "Node.js", language: "js", code: verifySample }]}
            tabsLabel="Checking a request"
            copiedMessage="Code copied"
          />
        </SettingsSection>
      ) : null}

      {expo || fcm || webhook ? (
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

      {expo || fcm ? (
        <SettingsSection
          title="In your app"
          description="Register the phone for its logged-in user, open the conversation when a notification is tapped, and call unregisterSupportDevice on logout."
        >
          <CodeSnippet
            wrap
            tabs={appTabs(origin)}
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
