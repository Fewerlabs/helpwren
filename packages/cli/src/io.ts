import { createInterface } from "node:readline/promises";

/** One way of answering a question: a person at a terminal, or flags and environment in CI. */
export interface Prompter {
  /** Free text. `secret` hides what is typed, for keys and passwords. */
  text(question: string, options?: TextOptions): Promise<string>;
  confirm(question: string, fallback: boolean): Promise<boolean>;
  select<Value extends string>(
    question: string,
    choices: readonly Choice<Value>[],
    fallback: Value,
  ): Promise<Value>;
}

export interface TextOptions {
  fallback?: string;
  secret?: boolean;
  /** Returns what is wrong with an answer, or `null` when it will do. */
  validate?: (answer: string) => string | null;
}

export interface Choice<Value extends string> {
  value: Value;
  label: string;
  hint?: string;
}

/** Where the installer reports progress. Secrets never go through here. */
export interface Output {
  step(message: string): void;
  info(message: string): void;
  ok(message: string): void;
  warn(message: string): void;
}

export const consoleOutput: Output = {
  step: (message) => {
    console.log(`\n${bold(message)}`);
  },
  info: (message) => {
    console.log(`  ${message}`);
  },
  ok: (message) => {
    console.log(`  ${green("✓")} ${message}`);
  },
  warn: (message) => {
    console.warn(`  ${yellow("!")} ${message}`);
  },
};

// Colour only on a terminal that has it, so logs in CI stay plain text.
const colour = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) =>
  colour ? `\u001b[${code}m${text}\u001b[0m` : text;
const bold = paint(1);
const green = paint(32);
const yellow = paint(33);

/** Reads a line without showing it, for keys and passwords. */
async function readHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let answer = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish();
          resolve(answer);
          return;
        }
        if (char === "\u0003") {
          finish();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\u007f" || char === "\b") answer = answer.slice(0, -1);
        else answer += char;
      }
    };
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    stdin.on("data", onData);
  });
}

/** Asks at the terminal. Enter takes the value in brackets. */
export function terminalPrompter(): Prompter {
  async function ask(question: string): Promise<string> {
    const lines = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await lines.question(question)).trim();
    } finally {
      lines.close();
    }
  }

  return {
    async text(question, { fallback, secret = false, validate } = {}) {
      for (;;) {
        // A saved secret is offered as "keep", never shown.
        const shown = fallback === undefined || fallback === "" ? "" : secret ? "keep" : fallback;
        const label = `  ${question}${shown ? ` [${shown}]` : ""}: `;
        const typed = secret && process.stdin.isTTY ? await readHidden(label) : await ask(label);
        const answer = typed.trim() === "" ? (fallback ?? "") : typed.trim();
        const problem = validate?.(answer) ?? null;
        if (!problem) return answer;
        console.log(`  ${yellow(problem)}`);
      }
    },
    async confirm(question, fallback) {
      for (;;) {
        const answer = (await ask(`  ${question} ${fallback ? "[Y/n]" : "[y/N]"}: `)).toLowerCase();
        if (answer === "") return fallback;
        if (answer === "y" || answer === "yes") return true;
        if (answer === "n" || answer === "no") return false;
      }
    },
    async select(question, choices, fallback) {
      console.log(`  ${question}`);
      choices.forEach((choice, index) => {
        console.log(`    ${index + 1}. ${choice.label}${choice.hint ? `: ${choice.hint}` : ""}`);
      });
      const start = choices.findIndex((choice) => choice.value === fallback) + 1;
      for (;;) {
        const answer = await ask(`  Choose 1-${choices.length} [${start}]: `);
        const picked = answer === "" ? start : Number(answer);
        const choice = choices[picked - 1];
        if (choice) return choice.value;
      }
    },
  };
}

/**
 * Answers every question with its default, for CI and scripts. A question with no default and
 * no value from a flag or the environment stops the run, naming what is missing.
 */
export function unattendedPrompter(): Prompter {
  return {
    text(question, { fallback, validate } = {}) {
      if (fallback === undefined || fallback === "") {
        return Promise.reject(new MissingAnswerError(question));
      }
      const problem = validate?.(fallback) ?? null;
      if (problem) return Promise.reject(new MissingAnswerError(`${question}: ${problem}`));
      return Promise.resolve(fallback);
    },
    confirm: (_question, fallback) => Promise.resolve(fallback),
    select: (_question, _choices, fallback) => Promise.resolve(fallback),
  };
}

export class MissingAnswerError extends Error {
  constructor(question: string) {
    super(`No answer for "${question}". Pass it as a flag or an environment variable.`);
    this.name = "MissingAnswerError";
  }
}
