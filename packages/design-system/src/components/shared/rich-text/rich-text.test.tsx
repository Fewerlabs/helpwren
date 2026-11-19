import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RichText, richTextHeadings, safeHref, type RichTextNode } from "./rich-text";
import { youtubeId } from "./video";

const words = (value: string, marks?: RichTextNode["marks"]): RichTextNode => ({
  type: "text",
  text: value,
  marks,
});
const block = (type: string, content: RichTextNode[], attrs?: RichTextNode["attrs"]) => ({
  type,
  content,
  attrs,
});
const doc = (...content: RichTextNode[]): RichTextNode => ({ type: "doc", content });

describe("RichText", () => {
  it("draws headings, paragraphs, lists, quotes and code", () => {
    render(
      <RichText
        doc={doc(
          block("heading", [words("Before you start")], { level: 2 }),
          block("paragraph", [words("You are an "), words("admin", [{ type: "bold" }])]),
          block("bulletList", [block("listItem", [block("paragraph", [words("One")])])]),
          block("orderedList", [block("listItem", [block("paragraph", [words("Two")])])], {
            start: 3,
          }),
          block("blockquote", [block("paragraph", [words("Quoted")])]),
          block("codeBlock", [words("<script>alert(1)</script>")]),
        )}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Before you start" })).toHaveAttribute(
      "id",
      "before-you-start",
    );
    expect(screen.getByText("admin").tagName).toBe("STRONG");
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getAllByRole("list")[1]).toHaveAttribute("start", "3");
    expect(screen.getByText("Quoted").closest("blockquote")).not.toBeNull();
    // Code is shown as text, never run.
    expect(screen.getByText("<script>alert(1)</script>").tagName).toBe("CODE");
    expect(document.querySelector("script")).toBeNull();
  });

  it("opens links to other sites in a new tab and keeps links within the site in place", () => {
    render(
      <RichText
        doc={doc(
          block("paragraph", [
            words("docs", [{ type: "link", attrs: { href: "https://example.com/docs" } }]),
            words("billing", [{ type: "link", attrs: { href: "/help/billing" } }]),
          ]),
        )}
      />,
    );
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "docs" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "billing" })).not.toHaveAttribute("target");
  });

  it("shows the words of an unsafe link without the link", () => {
    render(
      <RichText
        doc={doc(
          block("paragraph", [
            words("click me", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
          ]),
        )}
      />,
    );
    expect(screen.getByText("click me")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("leaves out kinds of node it does not know, and pictures from unsafe addresses", () => {
    const { container } = render(
      <RichText
        doc={doc(
          { type: "script", text: "alert(1)" },
          { type: "iframe", attrs: { src: "https://example.com" } },
          { type: "image", attrs: { src: "data:text/html,<script>alert(1)</script>" } },
          { type: "image", attrs: { src: "https://example.com/a.png", alt: "A chart" } },
        )}
      />,
    );
    expect(container.querySelector("script, iframe")).toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "A chart" })).toHaveAttribute("loading", "lazy");
  });

  it("names a callout by what it is for", () => {
    render(
      <RichText
        doc={doc(
          block("callout", [block("paragraph", [words("Keep two admins.")])], { tone: "warning" }),
          block("callout", [block("paragraph", [words("Plain note.")])], { tone: "made-up" }),
        )}
      />,
    );
    expect(screen.getByRole("note", { name: "Warning" })).toHaveTextContent("Keep two admins.");
    expect(screen.getByRole("note", { name: "Note" })).toHaveAttribute("data-tone", "info");
  });
});

describe("video", () => {
  it("plays a YouTube video in the privacy-enhanced player", () => {
    render(<RichText doc={doc({ type: "video", attrs: { id: "dQw4w9WgXcQ" } })} />);
    expect(screen.getByTitle("YouTube video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
    );
  });

  it("frames nothing for an id that is not a YouTube video's", () => {
    render(<RichText doc={doc({ type: "video", attrs: { id: "javascript:alert(1)" } })} />);
    expect(screen.queryByTitle("YouTube video")).toBeNull();
  });
});

describe("youtubeId", () => {
  it("reads the id from each kind of YouTube address", () => {
    for (const address of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
    ]) {
      expect(youtubeId(address)).toBe("dQw4w9WgXcQ");
    }
  });

  it("refuses addresses that are not YouTube videos", () => {
    for (const address of [
      "https://vimeo.com/123456",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "not a link",
      42,
    ]) {
      expect(youtubeId(address)).toBeUndefined();
    }
  });
});

describe("richTextHeadings", () => {
  it("lists the headings with the ids the page gives them, numbering repeats", () => {
    const article = doc(
      block("heading", [words("Set up")], { level: 2 }),
      block("heading", [words("On iOS")], { level: 3 }),
      block("heading", [words("Set up")], { level: 2 }),
      block("heading", [], { level: 2 }),
    );
    expect(richTextHeadings(article)).toEqual([
      { id: "set-up", text: "Set up", level: 2 },
      { id: "on-ios", text: "On iOS", level: 3 },
      { id: "set-up-2", text: "Set up", level: 2 },
    ]);

    render(<RichText doc={article} />);
    expect(screen.getAllByRole("heading", { name: "Set up" })[1]).toHaveAttribute("id", "set-up-2");
  });
});

describe("safeHref", () => {
  it("accepts web, email and phone addresses and paths on this site", () => {
    for (const href of ["https://a.example", "mailto:a@b.example", "tel:+123", "/help", "#top"]) {
      expect(safeHref(href)).toBe(href);
    }
  });

  it("refuses everything else", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "", 4]) {
      expect(safeHref(href)).toBeUndefined();
    }
  });
});
