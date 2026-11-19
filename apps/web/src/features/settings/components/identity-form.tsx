"use client";

import { type VerifiedIdentity } from "@helpwren/adapters/settings";
import {
  Badge,
  Button,
  CodeSnippet,
  FieldList,
  Textarea,
  toast,
  useConfirm,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { createIdentityKey, removeIdentityKey, saveIdentity, tryIdentityToken } from "../actions";
import { identitySchema, type IdentityValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

/** A signing key as this page sees it: never its secret, except once, when it is made. */
export interface SigningKeyRow {
  id: string;
  createdAt: string | null;
}

export interface IdentityFormProps {
  values: IdentityValues;
  keys: SigningKeyRow[];
  /** How many keys may be in use at once. */
  keysMax: number;
  canEdit: boolean;
}

const modeOptions = [
  { value: "none", label: "Guests only" },
  { value: "signed_token", label: "Signed token, from your server" },
  { value: "profile_endpoint", label: "Your product's profile endpoint" },
] as const;

const modeHints: Record<IdentityValues["mode"], string> = {
  none: "Everyone chats as a guest. A page can still pass a name and email as labels.",
  signed_token:
    "Your server signs a short token for the logged-in user with a key from this page. Works with any backend.",
  profile_endpoint:
    "The chat passes on the user's own access token, and this install asks your product who it belongs to. No new code on your server.",
};

const createdFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function serverSample(keyId: string): string {
  return [
    'import { SignJWT } from "jose";',
    "",
    "// On your server, for the user who is logged in. Never in the browser or an app.",
    "const token = await new SignJWT({ name: user.name, email: user.email })",
    `  .setProtectedHeader({ alg: "HS256", kid: "${keyId}" })`,
    "  .setSubject(String(user.id))",
    '  .setExpirationTime("10m")',
    "  .sign(new TextEncoder().encode(process.env.HELPWREN_SIGNING_SECRET));",
  ].join("\n");
}

const pageSamples = {
  signed_token: [
    'Helpwren.init({ source: "web" });',
    "// A function, so a fresh token is fetched when one runs out.",
    'Helpwren.identify({ token: () => fetch("/api/helpwren-token").then((r) => r.text()) });',
    "",
    "// When they log out:",
    "Helpwren.reset();",
  ].join("\n"),
  profile_endpoint: [
    'Helpwren.init({ source: "web" });',
    "// The access token your own app already sends to your API.",
    "Helpwren.identify({ token: () => getAccessToken() });",
    "",
    "// When they log out:",
    "Helpwren.reset();",
  ].join("\n"),
};

/** Who said what, in the words an admin checking their mapping wants to see. */
function describe(identity: VerifiedIdentity): [string, string][] {
  return [
    ["User id", identity.externalId],
    ["Name", identity.name ?? "Not given"],
    ["Email", identity.email ?? "Not given"],
    [
      "Organisation",
      identity.org ? `${identity.org.name ?? identity.org.id} (${identity.org.id})` : "None",
    ],
    ["Audience", identity.audience ?? "Not given"],
    ...Object.entries(identity.attributes).map(([label, value]): [string, string] => [
      label,
      String(value),
    ]),
  ];
}

/** How the install recognises a product's logged-in users, and the keys and test for it. */
export function IdentityForm({ values, keys, keysMax, canEdit }: IdentityFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saved, setSaved] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string; secret: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<
    { ok: true; identity: VerifiedIdentity } | { ok: false; detail: string } | null
  >(null);

  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: values,
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const disabled = !canEdit || form.formState.isSubmitting;

  const modeFields: FieldItem<IdentityValues>[] = [
    {
      name: "mode",
      label: "Identify visitors by",
      type: "radio",
      hint: modeHints[mode],
      props: { options: modeOptions },
    },
  ];
  const endpointFields: FieldItem<IdentityValues>[] = [
    {
      name: "url",
      label: "Profile address",
      type: "input",
      hint: "Called with the user's token as a bearer token. It must answer with JSON for that user.",
      props: { type: "url", autoCapitalize: "none", placeholder: "https://api.example.com/me" },
    },
    {
      name: "idField",
      label: "User id",
      type: "input",
      hint: "Where the id is in the answer, with dots between names.",
      props: { autoCapitalize: "none", placeholder: "data.id" },
    },
    {
      name: "nameFields",
      label: "Name",
      type: "input",
      hint: "One field, or several joined with spaces, separated by commas.",
      props: { autoCapitalize: "none", placeholder: "data.firstName, data.lastName" },
    },
    {
      name: "emailField",
      label: "Email",
      type: "input",
      props: { autoCapitalize: "none", placeholder: "data.email" },
    },
    {
      name: "orgIdField",
      label: "Organisation id",
      type: "input",
      hint: "Optional. People in the same organisation see each other's conversations.",
      props: { autoCapitalize: "none", placeholder: "data.company.id" },
    },
    {
      name: "orgNameField",
      label: "Organisation name",
      type: "input",
      props: { autoCapitalize: "none", placeholder: "data.company.name" },
    },
    {
      name: "audienceField",
      label: "Audience",
      type: "input",
      props: { autoCapitalize: "none", placeholder: "data.type" },
    },
    {
      name: "audiences",
      label: "Audience values",
      type: "textarea",
      hint: "What your product's values mean here, one a line: Business = business.",
      props: { rows: 3, className: "font-mono" },
    },
    {
      name: "attributes",
      label: "Shown to your team",
      type: "textarea",
      hint: "Other fields to show beside a conversation, one a line: Plan = data.plan.",
      props: { rows: 3, className: "font-mono" },
    },
  ];

  async function save(next: IdentityValues) {
    setSaved(false);
    try {
      const result = await saveIdentity(next);
      if (result.ok) {
        form.reset(next);
        setSaved(true);
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  async function createKey() {
    setCreating(true);
    try {
      const result = await createIdentityKey();
      if (result.ok) {
        setNewKey(result.key);
        router.refresh();
      } else {
        toast.error(
          result.reason === "full"
            ? `Remove a key first: at most ${String(keysMax)} can be in use.`
            : "Only admins can make keys.",
        );
      }
    } catch {
      toast.error("The key could not be made. Try again.");
    } finally {
      setCreating(false);
    }
  }

  function removeKey(id: string) {
    void confirm({
      tone: "destructive",
      icon: "trash",
      title: `Remove ${id}?`,
      description:
        "Tokens signed with it stop working at once, and anyone they had signed in is a guest again on their next visit.",
      confirmLabel: "Remove key",
      onConfirm: async () => {
        const result = await removeIdentityKey(id);
        if (!result.ok) throw new Error(saveErrors[result.reason]);
        if (newKey?.id === id) setNewKey(null);
        toast.success("Key removed");
        router.refresh();
      },
    });
  }

  async function test() {
    setTesting(true);
    setTested(null);
    try {
      setTested(await tryIdentityToken(form.getValues(), token));
    } catch {
      setTested({ ok: false, detail: "The token could not be tested. Try again." });
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
        title="Logged-in users"
        description="How this install learns which of your users is chatting, so their conversations follow them to every device."
      >
        <FieldList control={form.control} fields={modeFields} disabled={disabled} />
      </SettingsSection>

      {mode === "profile_endpoint" ? (
        <SettingsSection
          title="Profile endpoint"
          description="The address in your product that says who a token belongs to, and where each detail is in its answer."
        >
          <FieldList control={form.control} fields={endpointFields} disabled={disabled} />
        </SettingsSection>
      ) : null}

      {mode === "signed_token" ? (
        <SettingsSection
          title="Signing keys"
          description={`Your server signs tokens with one of these. Up to ${String(keysMax)} can be in use, so a key can be replaced without logging anyone out.`}
        >
          {keys.length === 0 && !newKey ? (
            <p className="text-muted-foreground">No keys yet. Make one to start.</p>
          ) : (
            <ul aria-label="Signing keys" className="grid gap-2">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="border-line flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="grid gap-0.5">
                    <span className="font-mono">{key.id}</span>
                    {key.createdAt ? (
                      <span className="text-muted-foreground text-xs">
                        Made {createdFormat.format(new Date(key.createdAt))}
                      </span>
                    ) : null}
                  </span>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        removeKey(key.id);
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {newKey ? (
            <div role="status" className="grid gap-2">
              <p className="font-medium">
                Copy the secret for {newKey.id} now. It will not be shown again.
              </p>
              <CodeSnippet
                variant="inline"
                aria-label="Signing secret"
                code={newKey.secret}
                copyLabel="Copy secret"
                copiedLabel="Secret copied"
                copiedMessage="Secret copied"
              />
            </div>
          ) : null}
          {canEdit ? (
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={creating}
                disabled={keys.length >= keysMax}
                onClick={() => {
                  void createKey();
                }}
              >
                Make a signing key
              </Button>
            </div>
          ) : null}
          {keys.length > 0 || newKey ? (
            <CodeSnippet
              wrap
              tabs={[
                {
                  label: "Node.js",
                  language: "js",
                  code: serverSample(newKey?.id ?? keys.at(-1)?.id ?? ""),
                },
              ]}
              tabsLabel="Signing a token"
              copiedMessage="Code copied"
            />
          ) : null}
        </SettingsSection>
      ) : null}

      {mode !== "none" ? (
        <SettingsSection
          title="On your pages"
          description="Call identify after init wherever someone is logged in, and reset when they log out."
        >
          <CodeSnippet
            wrap
            tabs={[{ label: "JavaScript", language: "js", code: pageSamples[mode] }]}
            tabsLabel="Identifying a user"
            copiedMessage="Code copied"
          />
        </SettingsSection>
      ) : null}

      {canEdit && mode !== "none" ? (
        <SettingsSection
          title="Test a token"
          description="Checks a real token with the settings on this page, saved or not. It signs no one in and keeps nothing."
        >
          <Textarea
            aria-label="Token to test"
            rows={3}
            className="font-mono"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setTested(null);
            }}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={testing}
              disabled={token.trim() === ""}
              onClick={() => {
                void test();
              }}
            >
              Test token
            </Button>
          </div>
          {tested?.ok ? (
            <div role="status" aria-label="Test result" className="grid gap-2">
              <Badge variant="accent">Accepted</Badge>
              <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1">
                {describe(tested.identity).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : tested ? (
            <p role="alert" className="text-destructive">
              {tested.detail}
            </p>
          ) : null}
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
