"use client";

import { type Settings } from "@helpwren/core";
import { Button, cn, EmptyState, Icon } from "@helpwren/design-system";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { getDashboardClient } from "@/features/dashboard";
import {
  BrandBasicsForm,
  EmailForm,
  InstallationForm,
  type EmailFormProps,
} from "@/features/settings";
import { HelpwrenProvider } from "@/lib/helpwren-context";

import { finishSetup } from "../actions";
import { setupSteps, type SetupStep } from "../schemas";
import { WidgetCheck } from "./widget-check";

const DOCS_URL = "https://helpwren.fewerlabs.dev/docs";

const labels: Record<SetupStep | "admin" | "done", string> = {
  admin: "Admin",
  brand: "Brand",
  email: "Email",
  widget: "Widget",
  done: "Done",
};

/** Where the wizard is, as a row of steps. The admin step is always behind by now. */
export function SetupSteps({ current }: { current: SetupStep | "admin" | "done" }) {
  const order = ["admin", ...setupSteps, "done"] as const;
  const at = order.indexOf(current);
  return (
    <ol aria-label="Setup steps" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {order.map((step, index) => (
        <li
          key={step}
          aria-current={index === at ? "step" : undefined}
          className={cn(
            "flex items-center gap-1.5",
            index === at ? "text-foreground font-medium" : "text-muted-foreground",
          )}
        >
          {index < at ? (
            <Icon name="check" className="text-status-resolved size-4" />
          ) : (
            <span className="tabular-nums">{index + 1}.</span>
          )}
          {labels[step]}
        </li>
      ))}
    </ol>
  );
}

export interface SetupWizardProps {
  step: SetupStep;
  settings: Settings;
  /** How this install sends mail, such as "SMTP", or `null` when none is set up. */
  emailProvider: string | null;
  /** The signed-in admin's address, where a test email goes. */
  adminEmail: string;
  /** Which secrets for replies by email are saved, for the Email step. */
  inbound: EmailFormProps["inbound"];
  appUrl: string;
}

/**
 * The wizard after the first admin has signed in: brand, email, the widget, then done. Each
 * step saves on its own and can be left for later; all of them are in Settings afterwards.
 */
export function SetupWizard({
  step,
  settings,
  emailProvider,
  adminEmail,
  inbound,
  appUrl,
}: SetupWizardProps) {
  const router = useRouter();
  const [finished, setFinished] = useState(false);
  const [finishing, startFinishing] = useTransition();

  const go = (next: SetupStep) => {
    router.push(`/setup?step=${next}`);
  };
  const finish = (then: "done" | "dashboard") => {
    startFinishing(async () => {
      await finishSetup();
      if (then === "done") setFinished(true);
      else router.push("/dashboard");
    });
  };
  const next = setupSteps[setupSteps.indexOf(step) + 1];
  const onward = (label: string) =>
    next ? (
      <Button
        onClick={() => {
          go(next);
        }}
      >
        {label}
      </Button>
    ) : (
      <Button
        loading={finishing}
        onClick={() => {
          finish("done");
        }}
      >
        {label}
      </Button>
    );

  if (finished) {
    return (
      <Frame current="done">
        <EmptyState
          scene="resolved"
          headingLevel={2}
          title="Helpwren is ready"
          description="Everything you skipped is in Settings whenever you want it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <a href="/dashboard/inbox">Open the inbox</a>
              </Button>
              <Button variant="secondary" asChild>
                <a href="/help" target="_blank" rel="noreferrer">
                  See the help center
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href={DOCS_URL} target="_blank" rel="noreferrer">
                  Read the docs
                </a>
              </Button>
            </div>
          }
        />
      </Frame>
    );
  }

  const skipAll = (
    <Button
      variant="ghost"
      size="sm"
      disabled={finishing}
      onClick={() => {
        finish("dashboard");
      }}
    >
      Skip the rest of setup
    </Button>
  );

  return (
    <HelpwrenProvider getClient={getDashboardClient}>
      <Frame current={step} aside={skipAll}>
        {step === "brand" ? (
          <Step
            title="Your brand"
            description="The name, logo and colour visitors see in the chat and the help center."
          >
            <BrandBasicsForm
              settings={settings}
              onSaved={() => {
                go("email");
              }}
            >
              <Button
                variant="ghost"
                onClick={() => {
                  go("email");
                }}
              >
                Do this later
              </Button>
            </BrandBasicsForm>
          </Step>
        ) : null}
        {step === "email" ? (
          <Step
            title="Email"
            description={
              emailProvider
                ? `This install sends mail through ${emailProvider}. Say who it comes from, then send yourself a test.`
                : "No email provider is set up yet, so Helpwren sends no mail of its own: no reply notifications, no ticket updates. Set EMAIL_PROVIDER in the server's environment to turn it on (see https://helpwren.fewerlabs.dev/docs/email)."
            }
            footer={
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    go("brand");
                  }}
                >
                  Back
                </Button>
                {onward("Continue")}
              </>
            }
          >
            <EmailForm
              settings={settings}
              provider={emailProvider}
              testAddress={adminEmail}
              inbound={inbound}
              origin={new URL(appUrl).origin}
              canEdit
            />
          </Step>
        ) : null}
        {step === "widget" ? (
          <Step
            title="Put the chat on your site"
            description="Paste the snippet into your site. This page notices as soon as the widget loads there."
            footer={
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    go("email");
                  }}
                >
                  Back
                </Button>
                {onward("Finish")}
              </>
            }
          >
            <WidgetCheck />
            <InstallationForm settings={settings} appUrl={appUrl} canEdit />
          </Step>
        ) : null}
      </Frame>
    </HelpwrenProvider>
  );
}

function Frame({
  current,
  aside,
  children,
}: {
  current: SetupStep | "done";
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SetupSteps current={current} />
        {aside}
      </div>
      {children}
    </div>
  );
}

function Step({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
      {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
    </section>
  );
}
