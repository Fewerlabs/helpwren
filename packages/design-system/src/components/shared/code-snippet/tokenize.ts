/** What a piece of code is, which decides its colour. */
export type TokenKind = "plain" | "tag" | "attribute" | "string" | "comment" | "keyword" | "number";

export interface Token {
  kind: TokenKind;
  text: string;
}

type Grammar = "markup" | "script" | "shell";

/** The names a language goes by, lower-cased, and the grammar that colours it. */
const grammars: Record<string, Grammar> = {
  html: "markup",
  xml: "markup",
  svg: "markup",
  js: "script",
  jsx: "script",
  ts: "script",
  tsx: "script",
  javascript: "script",
  typescript: "script",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  shell: "shell",
};

/** One kind of token and the pattern that matches it. Patterns are sticky: they match in place. */
type Rule = readonly [TokenKind, RegExp];

const scriptRules: readonly Rule[] = [
  ["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
  ["string", /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/y],
  [
    "keyword",
    /(?<![\w$.])(?:as|async|await|break|case|catch|class|const|continue|default|delete|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|switch|this|throw|true|try|type|typeof|undefined|var|void|while)(?![\w$])/y,
  ],
  ["number", /(?<![\w$])\d[\w.]*/y],
  // A JSX tag. After a name or a closing bracket, `<` is a comparison or a type argument.
  ["tag", /(?<![\w$)\]])<\/?[A-Za-z][\w.]*/y],
  // A JSX attribute: a name set straight to a string or an expression.
  ["attribute", /(?<=\s)[A-Za-z_][\w-]*(?==["'{])/y],
];

const shellRules: readonly Rule[] = [
  ["comment", /(?<![^\s])#[^\n]*/y],
  ["string", /"(?:[^"\\]|\\.)*"|'[^']*'/y],
  // The command: the first word of a line, or of what follows a pipe or `&&`.
  ["keyword", /(?<=^[ \t]*(?:\$ )?|[|;&][ \t]*)[A-Za-z_][\w.-]*(?![\w=])/my],
  ["attribute", /(?<![^\s])--?[A-Za-z][\w-]*/y],
];

/** What can appear between a tag's name and its closing bracket. */
const insideTagRules: readonly Rule[] = [
  ["string", /"[^"]*"|'[^']*'/y],
  ["tag", /\/?>/y],
  ["attribute", /[^\s"'<>/=]+/y],
];

const MARKUP_COMMENT = /<!--[\s\S]*?-->/y;
const TAG_START = /<\/?[A-Za-z][\w:-]*/y;

function matchAt(pattern: RegExp, code: string, index: number): string | undefined {
  pattern.lastIndex = index;
  const text = pattern.exec(code)?.[0];
  return text === "" ? undefined : text;
}

function firstMatch(rules: readonly Rule[], code: string, index: number): Token | undefined {
  for (const [kind, pattern] of rules) {
    const text = matchAt(pattern, code, index);
    if (text !== undefined) return { kind, text };
  }
  return undefined;
}

/** Adds a token, joining plain text to the plain text before it. */
function push(tokens: Token[], kind: TokenKind, text: string) {
  const last = tokens.at(-1);
  if (kind === "plain" && last?.kind === "plain") {
    last.text += text;
  } else if (text !== "") {
    tokens.push({ kind, text });
  }
}

function scan(code: string, rules: readonly Rule[], tokens: Token[]) {
  let index = 0;
  while (index < code.length) {
    const token = firstMatch(rules, code, index) ?? { kind: "plain", text: code.charAt(index) };
    push(tokens, token.kind, token.text);
    index += token.text.length;
  }
}

function scanMarkup(code: string, tokens: Token[]) {
  let index = 0;
  while (index < code.length) {
    const bracket = code.indexOf("<", index);
    if (bracket === -1) {
      push(tokens, "plain", code.slice(index));
      return;
    }
    push(tokens, "plain", code.slice(index, bracket));
    index = bracket;

    const comment = matchAt(MARKUP_COMMENT, code, index);
    if (comment !== undefined) {
      push(tokens, "comment", comment);
      index += comment.length;
      continue;
    }
    const start = matchAt(TAG_START, code, index);
    if (start === undefined) {
      push(tokens, "plain", "<");
      index += 1;
      continue;
    }
    push(tokens, "tag", start);
    index += start.length;

    // The rest of the tag, up to and including its closing bracket.
    while (index < code.length) {
      const token = firstMatch(insideTagRules, code, index) ?? {
        kind: "plain",
        text: code.charAt(index),
      };
      push(tokens, token.kind, token.text);
      index += token.text.length;
      if (token.kind === "tag") break;
    }

    // What a script tag holds is JavaScript, so it is coloured as that.
    if (start.toLowerCase() === "<script") {
      const close = code.toLowerCase().indexOf("</script", index);
      const end = close === -1 ? code.length : close;
      scan(code.slice(index, end), scriptRules, tokens);
      index = end;
    }
  }
}

/** Splits tokens at line breaks, so each line can be drawn, numbered and wrapped by itself. */
function toLines(tokens: readonly Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    token.text.split("\n").forEach((text, part) => {
      if (part > 0) lines.push([]);
      if (text !== "") lines.at(-1)?.push({ kind: token.kind, text });
    });
  }
  return lines;
}

/**
 * Breaks code into coloured pieces, line by line. It is a light pass for short snippets, not
 * a parser: it knows tags, attributes, strings, comments, keywords and numbers in HTML,
 * JavaScript and TypeScript (with JSX), and shell. Any other language comes back plain.
 */
export function tokenize(code: string, language?: string): Token[][] {
  const grammar = language === undefined ? undefined : grammars[language.trim().toLowerCase()];
  const tokens: Token[] = [];
  if (grammar === "markup") scanMarkup(code, tokens);
  else if (grammar === "script") scan(code, scriptRules, tokens);
  else if (grammar === "shell") scan(code, shellRules, tokens);
  else push(tokens, "plain", code);
  return toLines(tokens);
}
