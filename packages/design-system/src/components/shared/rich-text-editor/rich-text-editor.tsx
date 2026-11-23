"use client";

import { type Editor, type JSONContent } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { StarterKit } from "@tiptap/starter-kit";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "#lib/cn";

import { Button } from "../../base/button/button";
import { Icon } from "../../base/icon/icon";
import { type IconName } from "../../base/icon/registry";
import { Input } from "../../base/input/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../base/popover/popover";
import { Tooltip } from "../../base/tooltip/tooltip";
import { type RichTextNode } from "../rich-text/rich-text";
import { BlockHandle } from "./block-handle";
import { blockChoices, type BlockChoice } from "./blocks";
import { Callout } from "./callout";
import { Slash, type SlashMenuState } from "./slash";
import { Video } from "./video";

export interface RichTextEditorProps {
  /** Names the writing area for assistive technology, such as "Article body". */
  "aria-label": string;
  /**
   * The document to start from. The editor keeps its own copy from then on; give the editor a
   * new `key` to start again from another document.
   */
  defaultValue: RichTextNode;
  /** Called with the whole document after every change. */
  onChange?: (doc: RichTextNode) => void;
  /**
   * Stores a picture and gives back its address, or `null` if it could not be stored (say why
   * yourself, with a `toast`). Without it the editor offers no pictures.
   */
  uploadImage?: (file: File) => Promise<string | null>;
  /**
   * A window to add a picture from, such as `ImageLibraryDialog`, in place of going straight to
   * the computer's file picker. It is given whether it is open, and what to do with new files
   * or with the address of a picture already uploaded.
   */
  imagePicker?: (picker: RichTextImagePicker) => ReactNode;
  /** Shown on the empty line the caret is on. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** What `RichTextEditor`'s `imagePicker` is given. */
export interface RichTextImagePicker {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Uploads new pictures and puts them in. */
  upload: (files: File[]) => void;
  /** Puts in a picture already uploaded. */
  insert: (url: string) => void;
}

/** The pictures the editor takes, as a file picker's `accept`. */
export const richTextImageTypes = "image/png,image/jpeg,image/webp,image/gif";

const imagesIn = (files: FileList | undefined | null) =>
  [...(files ?? [])].filter((file) => file.type.startsWith("image/"));

/** A web address as typed, made whole: `example.com` becomes `https://example.com`. */
function completeAddress(value: string): string {
  const address = value.trim();
  if (address === "" || /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(address)) return address;
  return address.includes("@") && !address.includes("/")
    ? `mailto:${address}`
    : `https://${address}`;
}

interface ToolProps {
  label: string;
  icon: IconName;
  active?: boolean;
  onClick: () => void;
}

/** One button of the bar that floats over selected text. */
function Tool({ label, icon, active = false, onClick }: ToolProps) {
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={active}
        className={cn("shrink-0", active && "bg-muted")}
        // Keeps the selection in the text, so the format lands on it.
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onClick}
      >
        <Icon name={icon} />
      </Button>
    </Tooltip>
  );
}

interface InlineFieldProps {
  label: string;
  placeholder: string;
  initial: string;
  /** Shown when there is something to take away, such as an existing link. */
  removeLabel?: string | undefined;
  onSave: (value: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
}

/**
 * A one-line form inside the floating bar, for a link's address or a picture's description.
 * It lives in the bar itself, so the bar stays open while it is typed into.
 */
function InlineField({
  label,
  placeholder,
  initial,
  removeLabel,
  onSave,
  onRemove,
  onCancel,
}: InlineFieldProps) {
  const [value, setValue] = useState(initial);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // The form appears because the person asked for it, so typing can start at once.
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <form
      className="flex items-center gap-1.5 p-0.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        ref={input}
        value={value}
        placeholder={placeholder}
        className="h-8 min-h-8 w-64"
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      />
      <Button type="submit" size="sm">
        Save
      </Button>
      {removeLabel && onRemove ? (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          {removeLabel}
        </Button>
      ) : null}
    </form>
  );
}

interface BlockListProps {
  items: readonly BlockChoice[];
  /** The row the arrow keys are on, when the list is driven from the writing area. */
  activeIndex?: number;
  onChoose: (choice: BlockChoice) => void;
}

/** The menu of blocks: what `/` and the Add block button both open. */
function BlockList({ items, activeIndex, onChoose }: BlockListProps) {
  if (items.length === 0) {
    return <p className="text-muted-foreground px-2.5 py-2 text-sm">No block by that name.</p>;
  }
  return (
    <div role="group" aria-label="Blocks" className="grid gap-px">
      {items.map((choice, index) => (
        <Button
          key={choice.id}
          variant="ghost"
          aria-current={index === activeIndex ? "true" : undefined}
          className={cn(
            "h-auto justify-start gap-2.5 px-2 py-1.5 text-left font-normal",
            index === activeIndex && "bg-muted",
          )}
          // The caret stays in the text, so the block lands where it is.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            onChoose(choice);
          }}
          ref={(element) => {
            if (index === activeIndex) element?.scrollIntoView({ block: "nearest" });
          }}
        >
          <span className="border-rule bg-card grid size-8 shrink-0 place-items-center rounded-md border">
            <Icon name={choice.icon} className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{choice.label}</span>
            <span className="text-muted-foreground block truncate text-xs">{choice.hint}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}

const menuSurface = "border-rule bg-popover text-popover-foreground rounded-xl border";
/** The one shadow the editor uses: its menus float over the writing. */
const menuShadow = "shadow-[0_8px_24px_rgb(16_26_21/0.12)]";

/**
 * A rich-text editor for long writing, such as a help article, that works the way Notion does:
 * the page is only the writing. Typing `/` opens a menu of blocks (headings, lists, quotes,
 * code, callouts, pictures). Beside the block under the pointer are a plus, which adds a block
 * below, and a grip, which drags the block to a new place or opens what can be done to it.
 * Selecting text brings up a small bar for bold, italic, code and links, and Markdown
 * shortcuts such as `## ` and `- ` work as typed.
 *
 * It gives back a document tree, which `RichText` draws on the server with none of this code.
 */
export function RichTextEditor({
  "aria-label": label,
  defaultValue,
  onChange,
  uploadImage,
  imagePicker,
  placeholder = "Write, or type / for blocks",
  disabled = false,
  className,
}: RichTextEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [slash, setSlash] = useState<SlashMenuState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  /** Which one-line form the floating bar is showing in place of its buttons. */
  const [field, setField] = useState<"link" | "description" | null>(null);

  const pickFile = useCallback(() => {
    if (imagePicker) setPicking(true);
    else fileInput.current?.click();
  }, [imagePicker]);
  const choices = useMemo<readonly BlockChoice[]>(
    () =>
      uploadImage
        ? [
            ...blockChoices,
            {
              id: "picture",
              label: "Picture",
              hint: imagePicker
                ? "Upload an image, or use one already uploaded"
                : "Upload an image from your computer",
              icon: "image",
              keywords: "image photo screenshot upload",
              run: pickFile,
            },
          ]
        : blockChoices,
    [uploadImage, imagePicker, pickFile],
  );

  // The editor is made once, so it reads whatever is current from here.
  const latest = useRef({ onChange, uploadImage, choices, slash, slashIndex });
  useEffect(() => {
    latest.current = { onChange, uploadImage, choices, slash, slashIndex };
  });
  const insertImages = useRef<(files: File[]) => void>(() => undefined);
  // The editor tidies a document as it loads it, which is a change nobody made. Changes are
  // reported from the first time the person does something.
  const touched = useRef(false);

  const editor = useEditor({
    // Drawn after the page has loaded in the browser, so the server's page and the browser's
    // agree.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // The page's title is its only top heading, so writing starts a level down.
        heading: { levels: [2, 3] },
        link: { openOnClick: false, defaultProtocol: "https" },
      }),
      Image,
      Callout,
      Video,
      Placeholder.configure({ placeholder }),
      // eslint-disable-next-line react-hooks/refs -- these functions run later, on a key press, never while drawing
      Slash.configure({
        choices: () => latest.current.choices,
        onChange: (state) => {
          setSlash(state);
          setSlashIndex(0);
        },
        onKeyDown: (event) => {
          const open = latest.current.slash;
          if (!open) return false;
          const count = open.items.length;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (count > 0) {
              const step = event.key === "ArrowDown" ? 1 : -1;
              setSlashIndex((index) => (index + step + count) % count);
            }
            return true;
          }
          if (event.key === "Enter") {
            const choice = open.items[latest.current.slashIndex];
            if (choice) open.choose(choice);
            return true;
          }
          return false;
        },
      }),
    ],
    // The same tree under the editor's own type, whose node type is optional.
    content: defaultValue as JSONContent,
    editorProps: {
      attributes: {
        class: "hw-rich-text",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
      },
      handlePaste: (_view, event) => {
        const images = imagesIn(event.clipboardData?.files);
        if (images.length === 0 || !latest.current.uploadImage) return false;
        insertImages.current(images);
        return true;
      },
      handleDrop: (_view, event) => {
        const images = imagesIn(event.dataTransfer?.files);
        if (images.length === 0 || !latest.current.uploadImage) return false;
        event.preventDefault();
        insertImages.current(images);
        return true;
      },
    },
    onFocus: () => {
      touched.current = true;
    },
    onUpdate: ({ editor: current }) => {
      if (touched.current) latest.current.onChange?.(current.getJSON() as RichTextNode);
    },
    onSelectionUpdate: () => {
      setField(null);
    },
  });

  useEffect(() => {
    insertImages.current = (files) => {
      const upload = latest.current.uploadImage;
      if (!editor || !upload) return;
      touched.current = true;
      setUploading(true);
      void Promise.all(files.map((file) => upload(file)))
        .then((addresses) => {
          for (const src of addresses) {
            if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
          }
        })
        .finally(() => {
          setUploading(false);
        });
    };
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            strike: current.isActive("strike"),
            code: current.isActive("code"),
            link: current.isActive("link"),
            h2: current.isActive("heading", { level: 2 }),
            h3: current.isActive("heading", { level: 3 }),
            image: current.isActive("image"),
          }
        : null,
  });

  function bar(current: Editor, active: NonNullable<typeof state>): ReactNode {
    const run = () => current.chain().focus();
    if (field === "link") {
      return (
        <InlineField
          label="Link address"
          placeholder="https://example.com"
          initial={(current.getAttributes("link").href as string | undefined) ?? ""}
          removeLabel={active.link ? "Remove" : undefined}
          onSave={(value) => {
            const href = completeAddress(value);
            const chain = run().extendMarkRange("link");
            if (href) chain.setLink({ href }).run();
            else chain.unsetLink().run();
            setField(null);
          }}
          onRemove={() => {
            run().extendMarkRange("link").unsetLink().run();
            setField(null);
          }}
          onCancel={() => {
            setField(null);
            current.commands.focus();
          }}
        />
      );
    }
    if (field === "description") {
      return (
        <InlineField
          label="Picture description"
          placeholder="What the picture shows, for people who cannot see it"
          initial={(current.getAttributes("image").alt as string | null) ?? ""}
          onSave={(value) => {
            run().updateAttributes("image", { alt: value.trim() }).run();
            setField(null);
          }}
          onCancel={() => {
            setField(null);
            current.commands.focus();
          }}
        />
      );
    }
    if (active.image) {
      return (
        <div className="flex items-center gap-0.5 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setField("description");
            }}
          >
            Describe picture
          </Button>
          <Tool label="Remove picture" icon="trash" onClick={() => run().deleteSelection().run()} />
        </div>
      );
    }
    return (
      <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 p-0.5">
        <Tool
          label="Heading"
          icon="text-h-two"
          active={active.h2}
          onClick={() => run().toggleHeading({ level: 2 }).run()}
        />
        <Tool
          label="Subheading"
          icon="text-h-three"
          active={active.h3}
          onClick={() => run().toggleHeading({ level: 3 }).run()}
        />
        <span aria-hidden="true" className="bg-rule mx-0.5 h-5 w-px shrink-0" />
        <Tool
          label="Bold"
          icon="text-b"
          active={active.bold}
          onClick={() => run().toggleBold().run()}
        />
        <Tool
          label="Italic"
          icon="text-italic"
          active={active.italic}
          onClick={() => run().toggleItalic().run()}
        />
        <Tool
          label="Strikethrough"
          icon="text-strikethrough"
          active={active.strike}
          onClick={() => run().toggleStrike().run()}
        />
        <Tool
          label="Inline code"
          icon="code"
          active={active.code}
          onClick={() => run().toggleCode().run()}
        />
        <Tool
          label="Link"
          icon="link"
          active={active.link}
          onClick={() => {
            setField("link");
          }}
        />
      </div>
    );
  }

  return (
    <div data-slot="rich-text-editor" className={cn("relative flex flex-col", className)}>
      <EditorContent editor={editor} className="min-h-0 flex-1" />

      {editor && !disabled ? (
        <BlockHandle
          editor={editor}
          choices={choices}
          onUse={() => {
            touched.current = true;
          }}
        />
      ) : null}

      {editor && state && !disabled ? (
        <BubbleMenu
          editor={editor}
          className={cn(menuSurface, menuShadow, "z-50")}
          // Over selected words or a selected picture. Code is left as it was typed.
          shouldShow={({ editor: current, state: view }) =>
            current.isEditable &&
            !current.isActive("codeBlock") &&
            (current.isActive("image") || !view.selection.empty)
          }
        >
          {bar(editor, state)}
        </BubbleMenu>
      ) : null}

      {slash && !disabled ? (
        <div
          className={cn(menuSurface, menuShadow, "fixed z-50 max-h-80 w-72 overflow-y-auto p-1.5")}
          style={{
            top: (slash.rect?.bottom ?? 0) + 6,
            left: slash.rect?.left ?? 0,
          }}
        >
          <BlockList items={slash.items} activeIndex={slashIndex} onChoose={slash.choose} />
        </div>
      ) : null}

      {editor && !disabled ? (
        <div className="mt-3 flex items-center gap-2">
          <Popover open={adding} onOpenChange={setAdding}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2">
                <Icon name="plus" />
                Add block
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-80 w-72 overflow-y-auto p-1.5">
              <BlockList
                items={choices}
                onChoose={(choice) => {
                  touched.current = true;
                  setAdding(false);
                  choice.run(editor);
                }}
              />
            </PopoverContent>
          </Popover>
          {uploading ? (
            <p role="status" className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Icon name="spinner" className="size-3.5 animate-spin" />
              Uploading picture…
            </p>
          ) : null}
        </div>
      ) : null}

      {uploadImage && imagePicker && editor
        ? // eslint-disable-next-line react-hooks/refs -- upload and insert run later, on a click, never while drawing
          imagePicker({
            open: picking,
            onOpenChange: setPicking,
            upload: (files) => {
              insertImages.current(files);
            },
            insert: (url) => {
              touched.current = true;
              editor.chain().focus().setImage({ src: url, alt: "" }).run();
            },
          })
        : null}

      {uploadImage ? (
        <input
          ref={fileInput}
          type="file"
          aria-label="Picture file"
          accept={richTextImageTypes}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const images = imagesIn(event.target.files);
            // Cleared, so choosing the same file again still counts as a change.
            event.target.value = "";
            if (images.length > 0) insertImages.current(images);
          }}
        />
      ) : null}
    </div>
  );
}
