import { describe, expect, it } from "vitest";

import { tokenize, type Token } from "./tokenize";

/** The coloured pieces of one line, as `kind:text`, leaving plain text out. */
const coloured = (line: readonly Token[] | undefined) =>
  (line ?? [])
    .filter((token) => token.kind !== "plain")
    .map((token) => `${token.kind}:${token.text}`);

const text = (lines: readonly (readonly Token[])[]) =>
  lines.map((line) => line.map((token) => token.text).join("")).join("\n");

describe("tokenize", () => {
  it("never changes the code, whatever the language", () => {
    const code = '<a href="/x">\n\n  if (a < b) {}\n</a> # "open';
    for (const language of ["html", "tsx", "shell", "python", undefined]) {
      expect(text(tokenize(code, language))).toBe(code);
    }
  });

  it("leaves an unknown language plain, one piece a line", () => {
    expect(tokenize("SELECT 1;\nSELECT 2;", "SQL")).toEqual([
      [{ kind: "plain", text: "SELECT 1;" }],
      [{ kind: "plain", text: "SELECT 2;" }],
    ]);
  });

  it("colours HTML tags, attributes, strings and comments", () => {
    const lines = tokenize('<!-- chat -->\n<script src="/widget.js" async></script>', "HTML");
    expect(coloured(lines[0])).toEqual(["comment:<!-- chat -->"]);
    expect(coloured(lines[1])).toEqual([
      "tag:<script",
      "attribute:src",
      'string:"/widget.js"',
      "attribute:async",
      "tag:>",
      "tag:</script",
      "tag:>",
    ]);
  });

  it("colours what a script tag holds as JavaScript", () => {
    const lines = tokenize(
      '<script>\n  Helpwren.init({ source: "web" }); // go\n</script>',
      "html",
    );
    expect(coloured(lines[1])).toEqual(['string:"web"', "comment:// go"]);
    expect(coloured(lines[2])).toEqual(["tag:</script", "tag:>"]);
  });

  it("colours JavaScript keywords, strings, numbers and comments", () => {
    const lines = tokenize('import { x } from "y";\nconst n = 42; /* why */\nobject.default', "ts");
    expect(coloured(lines[0])).toEqual(["keyword:import", "keyword:from", 'string:"y"']);
    expect(coloured(lines[1])).toEqual(["keyword:const", "number:42", "comment:/* why */"]);
    // A property that happens to share a keyword's name is not one.
    expect(coloured(lines[2])).toEqual([]);
  });

  it("colours JSX tags and attributes, and not a comparison or a type argument", () => {
    expect(coloured(tokenize('<Script src="/w.js" onLoad={go} />', "jsx")[0])).toEqual([
      "tag:<Script",
      "attribute:src",
      'string:"/w.js"',
      "attribute:onLoad",
    ]);
    expect(coloured(tokenize("useState<string>(a)", "tsx")[0])).toEqual([]);
  });

  it("colours a shell command, its flags, strings and comments", () => {
    const lines = tokenize(
      '# install\nnpx helpwren install --app-url "https://x" | tee log',
      "Shell",
    );
    expect(coloured(lines[0])).toEqual(["comment:# install"]);
    expect(coloured(lines[1])).toEqual([
      "keyword:npx",
      "attribute:--app-url",
      'string:"https://x"',
      "keyword:tee",
    ]);
  });
});
