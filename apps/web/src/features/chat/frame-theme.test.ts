import { afterEach, describe, expect, it, vi } from "vitest";

import { applyFrameTheme, frameTheme, frameThemeScript } from "./frame-theme";

/** A device that prefers dark or light, and can switch while the chat is open. */
function device(dark: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches: dark,
    addEventListener: (_: "change", listener: () => void) => listeners.add(listener),
    removeEventListener: (_: "change", listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => media);
  return {
    switchTo(next: boolean) {
      media.matches = next;
      for (const listener of listeners) listener();
    },
    listening: () => listeners.size,
  };
}

const dark = () => document.documentElement.classList.contains("dark");

afterEach(() => {
  document.documentElement.classList.remove("dark");
  vi.unstubAllGlobals();
});

describe("the chat's theme in a frame", () => {
  it("is light unless the page asks for dark or the device's setting", () => {
    expect(frameTheme(undefined)).toBe("light");
    expect(frameTheme("sepia")).toBe("light");
    expect(frameTheme(["dark"])).toBe("light");
    expect(frameTheme("dark")).toBe("dark");
    expect(frameTheme("system")).toBe("system");
  });

  it("needs no script for light, and sets dark before anything is drawn", () => {
    expect(frameThemeScript("light")).toBeNull();
    expect(frameThemeScript("dark")).toBe('document.documentElement.classList.toggle("dark",true)');
    expect(frameThemeScript("system")).toContain("prefers-color-scheme: dark");
  });

  it("follows the device while asked to, and stops when told", () => {
    const phone = device(false);
    const stop = applyFrameTheme("system");
    expect(dark()).toBe(false);
    phone.switchTo(true);
    expect(dark()).toBe(true);

    stop();
    expect(phone.listening()).toBe(0);
    applyFrameTheme("light");
    phone.switchTo(true);
    expect(dark()).toBe(false);
  });

  it("goes dark or light when asked, whatever the device", () => {
    device(false);
    applyFrameTheme("dark");
    expect(dark()).toBe(true);
    applyFrameTheme("light");
    expect(dark()).toBe(false);
  });
});
