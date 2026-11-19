"use client";

import {
  ARTICLE_IMAGE_MAX_BYTES,
  ARTICLE_TAGS_MAX,
  richTextSchema,
  slugSchema,
  EMPTY_RICH_TEXT,
  type Article,
  type ArticleChanges,
  type ArticleVisibility,
  type ChangeArticleResult,
  type Collection,
  type CreateArticleResult,
} from "@helpwren/core";
import {
  ActionButton,
  Button,
  cn,
  Field,
  Icon,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  QueryDetail,
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  TagsInput,
  Textarea,
  toast,
  Tooltip,
  useConfirm,
  type RichTextNode,
} from "@helpwren/design-system";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { formatBytes } from "@/lib/format-bytes";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";

import {
  ARTICLES_QUERY_KEY,
  collectionHref,
  HELP_PATH,
  useArticlesChanged,
  useCollectionSlug,
  useCollections,
} from "../hooks/use-articles";
import { ArticleStatusChip } from "./article-status";

/** Stands for "no collection" in the list of choices, where a value cannot be empty. */
const NONE = "none";

type Failure =
  | Exclude<ChangeArticleResult, { ok: true }>["reason"]
  | Exclude<CreateArticleResult, { ok: true }>["reason"];

const failures: Record<Failure, string> = {
  forbidden: "You are not allowed to write articles.",
  not_found: "This article no longer exists.",
  slug_taken: "Another article already has that slug. Choose a different one.",
  slug_locked: "A published article keeps its slug. Unpublish it to change it.",
  needs_collection: "Choose a collection first. A published article has to be in one.",
};

const uploadFailures = {
  forbidden: "You are not allowed to add pictures.",
  too_large: `That picture is over ${formatBytes(ARTICLE_IMAGE_MAX_BYTES)}. Choose a smaller one.`,
  unsupported: "Choose a PNG, JPG, WebP or GIF picture.",
} as const;

/** Waits this long after the last keystroke before a new article is first saved. */
const CREATE_DELAY = 800;

// Blocks that are empty until something is put inside them. Any other node with nothing
// inside, such as a picture or a divider, is content in itself.
const CONTAINERS = new Set([
  "doc",
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "hardBreak",
]);

/** Whether the body holds anything a reader would see: words, a picture, a video. */
function hasContent(node: RichTextNode): boolean {
  if (node.type === "text") return Boolean(node.text?.trim());
  if (node.content?.length) return node.content.some(hasContent);
  return !CONTAINERS.has(node.type);
}

/**
 * The article a new one starts as, before it exists. Its id is empty until the first save
 * gives it one.
 */
function blankArticle(collection: Collection | undefined): Article {
  return {
    id: "",
    collectionId: collection?.id ?? null,
    collection: collection
      ? { id: collection.id, name: collection.name, slug: collection.slug }
      : null,
    title: "",
    slug: "",
    summary: null,
    status: "draft",
    position: 0,
    authorId: null,
    author: null,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
    tags: [],
    visibility: "public",
    featured: false,
    metaTitle: null,
    metaDescription: null,
    body: EMPTY_RICH_TEXT,
  };
}

/** The editor for the address it is at: `/dashboard/help/new`, or an article's own. */
export function ArticleEditorRoute() {
  const { id } = useParams<{ id?: string }>();
  const collectionSlug = useCollectionSlug();
  return <ArticleEditor articleId={id ?? null} collectionSlug={collectionSlug} />;
}

export interface ArticleEditorProps {
  /** The article to open, or `null` for a new one, which is made once there is something in it. */
  articleId: string | null;
  /** For a new article: the slug of the collection it starts in. */
  collectionSlug?: string | null | undefined;
}

/**
 * The page where one article is written, put in a collection and published. A new article
 * opens empty and exists only once it has a title and some words; the address then changes to
 * the article's own, and the editor stays as it is, with the caret where it was.
 */
export function ArticleEditor({ articleId, collectionSlug }: ArticleEditorProps) {
  const getClient = useHelpwren();
  const router = useRouter();
  // The article this editor made, so the address that changes to it keeps the same editor.
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (articleId === null || articleId === createdId) {
    return (
      <div className="h-full p-2">
        <QueryDetail
          key="new"
          // The collections are what a new article needs first: the one it starts in.
          queryKey={[...ARTICLES_QUERY_KEY, "collections"]}
          queryFn={() => getClient().collections.list()}
          placeholder="loader"
          messages={{ loading: "Opening the editor" }}
          className="border-rule bg-card h-full overflow-hidden rounded-xl border"
          contentClassName="h-full"
        >
          {(collections) => (
            <NewArticleForm
              collection={collections.find((item) => item.slug === collectionSlug)}
              onCreated={(article) => {
                setCreatedId(article.id);
                router.replace(`${HELP_PATH}/${article.id}`);
              }}
            />
          )}
        </QueryDetail>
      </div>
    );
  }

  return (
    <div className="h-full p-2">
      <QueryDetail
        key={articleId}
        queryKey={[...ARTICLES_QUERY_KEY, "detail", articleId]}
        queryFn={() => getClient().articles.get(articleId)}
        // The form keeps its own copy once loaded, so a refresh must not disturb the writing.
        staleTime={Infinity}
        // An editor is not shaped like a record panel, so it opens with the loader.
        placeholder="loader"
        messages={{
          loading: "Opening the article",
          notFound: "This article does not exist",
          notFoundDescription: "It may have been removed.",
        }}
        notFoundAction={
          <Button variant="secondary" size="sm" asChild>
            <Link href={HELP_PATH}>Back to the help center</Link>
          </Button>
        }
        className="border-rule bg-card h-full overflow-hidden rounded-xl border"
        // The page inside scrolls in its own columns, so it needs the card's full height.
        contentClassName="h-full"
      >
        {(article) => <EditorForm key={article.id} article={article} />}
      </QueryDetail>
    </div>
  );
}

interface NewArticleFormProps {
  collection: Collection | undefined;
  onCreated: (article: Article) => void;
}

/** The editor for an article that does not exist yet, starting in the collection given. */
function NewArticleForm({ collection, onCreated }: NewArticleFormProps) {
  // Made once: the editor reads its starting point only when it opens.
  const [blank] = useState(() => blankArticle(collection));
  return <EditorForm article={blank} onCreated={onCreated} />;
}

interface EditorFormProps {
  /** The article as saved, or a blank one whose empty id means it does not exist yet. */
  article: Article;
  /** Called when a new article is first saved, with what it became. */
  onCreated?: (article: Article) => void;
}

function EditorForm({ article, onCreated }: EditorFormProps) {
  const router = useRouter();
  const getClient = useHelpwren();
  const confirm = useConfirm();
  const changed = useArticlesChanged();
  const collections = useCollections().data ?? [];

  /** The article as the database last had it. */
  const [saved, setSaved] = useState(article);
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary ?? "");
  const [collectionId, setCollectionId] = useState(article.collectionId);
  const [slug, setSlug] = useState(article.slug);
  const [slugError, setSlugError] = useState<string>();
  const [tags, setTags] = useState<readonly string[]>(article.tags);
  const [visibility, setVisibility] = useState<ArticleVisibility>(article.visibility);
  const [featured, setFeatured] = useState(article.featured);
  const [metaTitle, setMetaTitle] = useState(article.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(article.metaDescription ?? "");
  const [authorId, setAuthorId] = useState(article.authorId);
  const [body, setBody] = useState<RichTextNode | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const featuredId = useId();

  const published = saved.status === "published";
  const exists = saved.id !== "";
  // Set while a new article is being made, so a second save cannot make it twice.
  const creating = useRef(false);
  const titleField = useRef<HTMLTextAreaElement>(null);
  const dirty =
    body !== null ||
    // Compared trimmed, as the server keeps them, so a trailing space is not a change.
    title.trim() !== saved.title ||
    summary.trim() !== (saved.summary ?? "") ||
    collectionId !== saved.collectionId ||
    slug !== saved.slug ||
    tags.join() !== saved.tags.join() ||
    visibility !== saved.visibility ||
    featured !== saved.featured ||
    metaTitle !== (saved.metaTitle ?? "") ||
    metaDescription !== (saved.metaDescription ?? "") ||
    authorId !== saved.authorId;

  // The team, to choose the author from. A hook, because the list is shared with other screens.
  const team =
    useQuery({ queryKey: ["team"], queryFn: () => getClient().agents.list() }).data ?? [];
  const feedback = useQuery({
    queryKey: [...ARTICLES_QUERY_KEY, "feedback"],
    queryFn: () => getClient().articles.feedbackTotals(),
    select: (totals) => totals[saved.id],
  }).data;

  /** Saves what has changed. Gives back the saved article, or `null` after saying what failed. */
  const save = useCallback(async (): Promise<Article | null> => {
    if (!exists && creating.current) return null;
    setSlugError(undefined);
    const changes: ArticleChanges = {};
    if (title.trim() !== saved.title || !exists) {
      if (!title.trim()) {
        toast.error("Give the article a title.");
        return null;
      }
      changes.title = title;
    }
    if (summary.trim() !== (saved.summary ?? "")) changes.summary = summary;
    if (collectionId !== saved.collectionId) changes.collectionId = collectionId;
    if (slug !== saved.slug) {
      const parsed = slugSchema.safeParse(slug);
      if (!parsed.success) {
        setSlugError("Use lower case letters, numbers and hyphens, such as reset-your-password.");
        return null;
      }
      changes.slug = parsed.data;
    }
    if (tags.join() !== saved.tags.join()) changes.tags = [...tags];
    if (visibility !== saved.visibility) changes.visibility = visibility;
    if (featured !== saved.featured) changes.featured = featured;
    if (metaTitle !== (saved.metaTitle ?? "")) changes.metaTitle = metaTitle;
    if (metaDescription !== (saved.metaDescription ?? "")) {
      changes.metaDescription = metaDescription;
    }
    if (authorId && authorId !== saved.authorId) changes.authorId = authorId;
    if (body) {
      const parsed = richTextSchema.safeParse(body);
      if (!parsed.success) {
        toast.error("The article holds something that cannot be saved. Undo the last change.");
        return null;
      }
      changes.body = parsed.data;
    }
    if (Object.keys(changes).length === 0) return saved;

    if (!exists) creating.current = true;
    try {
      const result = exists
        ? await getClient().articles.update(saved.id, changes)
        : await getClient().articles.create({ ...changes, title, collectionId });
      if (!result.ok) {
        if (result.reason === "slug_taken") setSlugError(failures.slug_taken);
        else toast.error(failures[result.reason]);
        return null;
      }
      const next = result.article;
      // Writing goes on while a save is on its way. Only what was sent takes the saved form;
      // anything typed since stays as typed, still to be saved.
      const settle =
        <Value,>(sent: Value, value: Value) =>
        (current: Value) =>
          current === sent ? value : current;
      // The title and summary are left as typed: the server only trims them, and a space just
      // typed before the next word must not vanish under the caret.
      setSaved(next);
      setSlug(settle(slug, next.slug));
      setTags(settle(tags, next.tags));
      setMetaTitle(settle(metaTitle, next.metaTitle ?? ""));
      setMetaDescription(settle(metaDescription, next.metaDescription ?? ""));
      setBody(settle<RichTextNode | null>(body, null));
      // A new article is credited to whoever made it.
      setAuthorId(settle(authorId, next.authorId));
      if (!exists) onCreated?.(next);
      await changed();
      return next;
    } catch {
      toast.error("The article could not be saved. Try again.");
      return null;
    } finally {
      creating.current = false;
    }
  }, [
    authorId,
    body,
    changed,
    collectionId,
    exists,
    featured,
    getClient,
    metaDescription,
    metaTitle,
    onCreated,
    saved,
    slug,
    summary,
    tags,
    title,
    visibility,
  ]);

  async function saveNow() {
    setBusy("save");
    const result = await save();
    setBusy(null);
    if (result) toast.success(published ? "Changes published" : "Draft saved");
  }

  async function setPublished(next: boolean) {
    if (!next) {
      const confirmed = await confirm({
        title: "Unpublish this article?",
        description:
          "It goes back to a draft. Visitors can no longer read it, and links to it stop working until it is published again.",
        confirmLabel: "Unpublish",
        icon: "eye-slash",
      });
      if (!confirmed) return;
    }
    setBusy("publish");
    try {
      const current = await save();
      if (!current) return;
      const result = next
        ? await getClient().articles.publish(current.id)
        : await getClient().articles.unpublish(current.id);
      if (!result.ok) {
        toast.error(failures[result.reason]);
        return;
      }
      setSaved(result.article);
      await changed();
      toast.success(next ? "Article published" : "Article unpublished");
    } catch {
      toast.error("That did not work. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const confirmed = await confirm({
      title: `Remove "${saved.title}"?`,
      description: published
        ? "The article is removed for good, with what readers said about it. Links to it stop working."
        : "The draft is removed for good.",
      confirmLabel: "Remove",
      tone: "destructive",
    });
    if (!confirmed) return;
    try {
      await getClient().articles.remove(saved.id);
      await changed();
      toast.success("Article removed");
      router.push(collectionHref(saved.collection?.slug));
    } catch {
      toast.error("The article could not be removed. Try again.");
    }
  }

  // The browser asks before a reload or a closed tab throws unsaved writing away.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  // A new article opens ready to type its title. Once it exists, the caret stays wherever the
  // writer has put it.
  useEffect(() => {
    if (!exists) titleField.current?.focus();
  }, [exists]);

  // A new article is made once it has a title and some words, after a pause in the typing, so
  // a page opened and left creates nothing.
  const create = useRef(save);
  useEffect(() => {
    create.current = save;
  });
  const ready = !exists && title.trim() !== "" && body !== null && hasContent(body);
  useEffect(() => {
    if (!ready) return undefined;
    const timer = window.setTimeout(() => void create.current(), CREATE_DELAY);
    return () => {
      window.clearTimeout(timer);
    };
  }, [ready, title, body]);

  // Cmd+S or Ctrl+S saves, as anyone who writes expects.
  const saveShortcut = useRef(saveNow);
  useEffect(() => {
    saveShortcut.current = saveNow;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveShortcut.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function leave() {
    const back = collectionHref(saved.collection?.slug);
    if (dirty) {
      const confirmed = await confirm({
        title: "Leave without saving?",
        description: "Your changes to this article have not been saved.",
        confirmLabel: "Leave",
        cancelLabel: "Keep writing",
        tone: "destructive",
      });
      if (!confirmed) return;
    }
    router.push(back);
  }

  async function uploadImage(file: File): Promise<string | null> {
    try {
      const result = await getClient().articles.uploadImage(file);
      if (result.ok) return result.url;
      toast.error(uploadFailures[result.reason]);
    } catch {
      toast.error("The picture could not be uploaded. Try again.");
    }
    return null;
  }

  const collection = collections.find((item) => item.id === collectionId);
  const publicPath =
    published && saved.collection ? `/help/${saved.collection.slug}/${saved.slug}` : null;

  return (
    <div className="flex h-full flex-col">
      {/* On a phone the row keeps to one line: where the article stands, the one action that
          matters most, and the rest in a menu. Every other button shows from md up. */}
      <header className="border-rule flex min-h-12 shrink-0 items-center gap-x-2 gap-y-1 border-b px-3 py-1.5 max-md:gap-x-1 max-md:px-2 md:flex-wrap">
        <ActionButton
          variant="ghost"
          icon="arrow-left"
          label="Help center"
          collapseBelow="md"
          className="text-muted-foreground -ml-1.5 max-md:-ml-0.5"
          onClick={() => void leave()}
        />
        <span className="flex-1" />
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap max-md:gap-1.5">
          {/* A phone shows the short form; screen readers always hear the full one. */}
          <span aria-hidden="true" className="text-muted-foreground truncate text-xs md:hidden">
            {!exists ? "New" : dirty ? "Unsaved" : formatTimeAgo(saved.updatedAt)}
          </span>
          <p role="status" className="text-muted-foreground text-xs max-md:sr-only">
            {!exists
              ? "Not saved yet"
              : dirty
                ? "Unsaved changes"
                : `Saved ${formatTimeAgo(saved.updatedAt)}`}
          </p>
          <ArticleStatusChip status={saved.status} />
        </div>
        <Tooltip content={dirty ? "Shows the article as last saved" : "See it as a visitor will"}>
          <Button
            variant="ghost"
            size="sm"
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50 max-md:hidden"
            asChild
          >
            <a
              href={exists ? `/help/preview/${saved.id}` : undefined}
              aria-disabled={!exists || undefined}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="eye" />
              Preview
            </a>
          </Button>
        </Tooltip>
        <Button
          variant="secondary"
          size="sm"
          // Publishing the changes is the main action on a phone, so there it is filled.
          className={cn(
            !published && "max-md:hidden",
            published &&
              "max-md:bg-primary max-md:text-primary-foreground max-md:hover:bg-primary/90 max-md:border-transparent max-md:px-2.5",
          )}
          disabled={!dirty || busy !== null}
          loading={busy === "save"}
          onClick={() => void saveNow()}
        >
          {published ? "Publish changes" : "Save draft"}
        </Button>
        {published ? (
          <Button
            variant="secondary"
            size="sm"
            className="max-md:hidden"
            disabled={busy !== null}
            loading={busy === "publish"}
            onClick={() => void setPublished(false)}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            size="sm"
            className="max-md:px-2.5"
            disabled={busy !== null}
            loading={busy === "publish"}
            onClick={() => void setPublished(true)}
          >
            Publish
          </Button>
        )}
        {exists ? (
          <Tooltip content="Remove article">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove article"
              className="max-md:hidden"
              disabled={busy !== null}
              onClick={() => void remove()}
            >
              <Icon name="trash" />
            </Button>
          </Tooltip>
        ) : null}
        <MoreActions
          previewHref={exists ? `/help/preview/${saved.id}` : null}
          disabled={busy !== null}
          onSaveDraft={published || !dirty ? null : () => void saveNow()}
          onUnpublish={published ? () => void setPublished(false) : null}
          onRemove={exists ? () => void remove() : null}
        />
      </header>

      <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
        <div className="min-w-0 flex-1 lg:overflow-y-auto">
          {/* Wide margins: the controls that appear beside a block sit in the left one. */}
          <div className="mx-auto max-w-3xl px-6 py-8 sm:px-16">
            <Textarea
              ref={titleField}
              aria-label="Title"
              rows={1}
              value={title}
              placeholder="Article title"
              className="[field-sizing:content] min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-3xl leading-tight font-semibold tracking-tight shadow-none md:text-3xl dark:bg-transparent"
              onChange={(event) => {
                // A title is one line, however it wraps.
                setTitle(event.target.value.replace(/\n/g, " "));
              }}
            />
            <Textarea
              aria-label="Summary"
              rows={1}
              value={summary}
              maxLength={300}
              placeholder="Add a one-line summary. It shows in lists and in search results."
              className="text-muted-foreground mt-2 [field-sizing:content] min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-base shadow-none md:text-base dark:bg-transparent"
              onChange={(event) => {
                setSummary(event.target.value.replace(/\n/g, " "));
              }}
            />
            <RichTextEditor
              aria-label="Article body"
              className="mt-6"
              defaultValue={article.body}
              onChange={setBody}
              uploadImage={uploadImage}
            />
          </div>
        </div>

        <aside
          aria-label="Article settings"
          className="border-rule grid shrink-0 content-start gap-5 p-4 max-lg:border-t lg:w-72 lg:overflow-y-auto lg:border-l"
        >
          <Select
            value={collectionId ?? NONE}
            onValueChange={(value) => {
              setCollectionId(value === NONE ? null : value);
            }}
          >
            <Field
              label="Collection"
              hint={collectionId ? undefined : "Needed before the article can be published."}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </Field>
            <SelectContent>
              <SelectItem value={NONE} disabled={published}>
                None yet
              </SelectItem>
              {collections.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Field label="Tags" hint="Labels to find and group articles by. Press Enter after each.">
            <TagsInput
              value={tags}
              max={ARTICLE_TAGS_MAX}
              placeholder={tags.length === 0 ? "refunds" : undefined}
              transform={(text) => text.trim().toLowerCase()}
              onValueChange={setTags}
            />
          </Field>

          <Select
            value={authorId ?? ""}
            onValueChange={(value) => {
              setAuthorId(value);
            }}
          >
            <Field label="Author">
              <SelectTrigger>
                <SelectValue placeholder="Unknown" />
              </SelectTrigger>
            </Field>
            <SelectContent>
              {team
                .filter((member) => member.active || member.id === authorId)
                .map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Section title="Publishing">
            <Field
              label="Slug"
              error={slugError}
              hint={
                published
                  ? "Fixed while the article is published, so links to it keep working."
                  : `/help/${collection?.slug ?? "collection"}/${slug}`
              }
            >
              <Input
                value={slug}
                disabled={published}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onValueChange={(value) => {
                  setSlug(value.toLowerCase().replace(/\s+/g, "-"));
                }}
              />
            </Field>

            <Select
              value={visibility}
              onValueChange={(value) => {
                setVisibility(value as ArticleVisibility);
              }}
            >
              <Field
                label="Visibility"
                hint={
                  visibility === "in_app"
                    ? "Left off the public help center and out of search engines."
                    : undefined
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </Field>
              <SelectContent>
                <SelectItem value="public">Help center and chat</SelectItem>
                <SelectItem value="in_app">Chat only</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-start justify-between gap-3">
              <div>
                <label htmlFor={featuredId} className="block font-medium">
                  Featured
                </label>
                <p id={`${featuredId}-hint`} className="text-muted-foreground text-xs">
                  Shown on the help center&apos;s home page and first in the chat.
                </p>
              </div>
              <Switch
                id={featuredId}
                aria-describedby={`${featuredId}-hint`}
                checked={featured}
                onCheckedChange={setFeatured}
              />
            </div>
          </Section>

          <Section title="Search engines">
            <Field label="SEO title" hint="Up to 70 characters. Left empty, the title is used.">
              <Input
                value={metaTitle}
                maxLength={70}
                placeholder={title}
                onValueChange={setMetaTitle}
              />
            </Field>
            <Field
              label="SEO description"
              hint="Up to 200 characters. Left empty, the summary is used."
            >
              <Textarea
                rows={3}
                value={metaDescription}
                maxLength={200}
                placeholder={summary}
                className="min-h-0"
                onChange={(event) => {
                  setMetaDescription(event.target.value);
                }}
              />
            </Field>
          </Section>

          <dl className="border-rule grid gap-2.5 border-t pt-4">
            <Detail term="Last changed">{formatTimeAgo(saved.updatedAt)}</Detail>
            <Detail term="Published">
              {saved.publishedAt ? formatTimeAgo(saved.publishedAt) : "Not yet"}
            </Detail>
            <Detail term="Found helpful">
              {feedback
                ? `${feedback.helpful} of ${feedback.helpful + feedback.unhelpful} readers`
                : "No answers yet"}
            </Detail>
          </dl>

          {publicPath ? (
            <Button variant="secondary" size="sm" asChild>
              <a href={publicPath} target="_blank" rel="noreferrer">
                View on the help center
                <Icon name="arrow-square-out" />
              </a>
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

interface MoreActionsProps {
  /** Where the preview opens, or `null` while the article does not exist yet. */
  previewHref: string | null;
  disabled: boolean;
  /** Each action is left out of the menu when it is `null`. */
  onSaveDraft: (() => void) | null;
  onUnpublish: (() => void) | null;
  onRemove: (() => void) | null;
}

const menuItem =
  "hover:bg-muted focus-visible:outline-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

/**
 * The editor's less frequent actions behind one button, for a phone, where the header has room
 * for only the main one beside where the article stands.
 */
function MoreActions({
  previewHref,
  disabled,
  onSaveDraft,
  onUnpublish,
  onRemove,
}: MoreActionsProps) {
  const [open, setOpen] = useState(false);
  // Each choice closes the menu first, so a confirmation that follows has the screen to itself.
  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="More actions" className="md:hidden">
          <Icon name="dots-three" weight="bold" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-48 gap-0.5 p-1" aria-label="More actions">
        <a
          href={previewHref ?? undefined}
          aria-disabled={previewHref === null || undefined}
          target="_blank"
          rel="noreferrer"
          className={menuItem}
          onClick={() => {
            setOpen(false);
          }}
        >
          <Icon name="eye" className="text-muted-foreground size-4" />
          Preview
        </a>
        {onSaveDraft ? (
          <button
            type="button"
            className={menuItem}
            disabled={disabled}
            onClick={choose(onSaveDraft)}
          >
            <Icon name="floppy-disk" className="text-muted-foreground size-4" />
            Save draft
          </button>
        ) : null}
        {onUnpublish ? (
          <button
            type="button"
            className={menuItem}
            disabled={disabled}
            onClick={choose(onUnpublish)}
          >
            <Icon name="eye-slash" className="text-muted-foreground size-4" />
            Unpublish
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className={cn(menuItem, "text-destructive hover:bg-destructive/10")}
            disabled={disabled}
            onClick={choose(onRemove)}
          >
            <Icon name="trash" className="size-4" />
            Remove article
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** A titled group of settings in the side panel, under a hairline. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-rule grid gap-4 border-t pt-4">
      <h2 className="text-muted-foreground text-2xs font-mono tracking-wider uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ term, children }: { term: string; children: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="truncate text-right">{children}</dd>
    </div>
  );
}
