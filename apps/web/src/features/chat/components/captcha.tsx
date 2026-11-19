"use client";

import { useEffect, useEffectEvent, useRef } from "react";

interface Turnstile {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<Turnstile> | undefined;

/** Loads Cloudflare's script once, the first time a captcha is shown. */
function loadTurnstile(): Promise<Turnstile> {
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("The captcha did not start."));
    };
    script.onerror = () => {
      // Let a later form try again, rather than remembering the failure for good.
      loading = undefined;
      reject(new Error("The captcha could not be loaded."));
    };
    document.head.append(script);
  });
  return loading;
}

export interface CaptchaProps {
  siteKey: string;
  /** Called with a fresh answer, and with `null` when an answer runs out or fails. */
  onToken: (token: string | null) => void;
}

/**
 * Cloudflare Turnstile, shown only when the install has switched it on. Most people are asked
 * nothing and see a small box tick itself. Each answer is good for one send: give the component
 * a new `key` after a send, and it asks again.
 */
export function Captcha({ siteKey, onToken }: CaptchaProps) {
  const box = useRef<HTMLDivElement>(null);
  const report = useEffectEvent(onToken);

  useEffect(() => {
    let widget: string | undefined;
    let gone = false;
    loadTurnstile()
      .then((turnstile) => {
        if (gone || !box.current) return;
        widget = turnstile.render(box.current, {
          sitekey: siteKey,
          callback: (token) => {
            report(token);
          },
          "expired-callback": () => {
            report(null);
          },
          "error-callback": () => {
            report(null);
          },
        });
      })
      .catch(() => {
        report(null);
      });
    return () => {
      gone = true;
      if (widget) window.turnstile?.remove(widget);
    };
  }, [siteKey]);

  return <div ref={box} className="min-h-16" />;
}
