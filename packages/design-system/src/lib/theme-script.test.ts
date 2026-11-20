import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY, themeScript } from "./theme-script";

function run(script: string) {
  // The script is meant for a <script> tag in the page's head; this runs it the same way.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the script under test
  const body = new Function(script) as () => void;
  body();
}

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("themeScript", () => {
  it("applies a stored dark choice before the page paints", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    run(themeScript());
    expect(document.documentElement).toHaveClass("dark");
  });

  it("leaves a stored light choice light", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    run(themeScript());
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("runs only under the given paths when some are given", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.history.replaceState(null, "", "/embed");
    run(themeScript({ paths: ["/dashboard", "/help"] }));
    expect(document.documentElement).not.toHaveClass("dark");

    window.history.replaceState(null, "", "/help/getting-started");
    run(themeScript({ paths: ["/dashboard", "/help"] }));
    expect(document.documentElement).toHaveClass("dark");
  });
});
