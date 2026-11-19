"use client";

import {
  ARTICLE_IMAGE_MAX_BYTES,
  ARTICLE_TAGS_MAX,
  richTextSchema,
  slugSchema,
  type Article,
  type ArticleChanges,
  type ArticleVisibility,
  type ChangeArticleResult,
} from "@helpwren/core";
import {
  Button,
  EmptyState,
  Field,
  Icon,
  Input,
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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { formatBytes } from "@/lib/format-bytes";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";

import {
  ARTICLES_QUERY_KEY,
  collectionHref,
  HELP_PATH,
  useArticlesChanged,
  useCollections,
} from "../hooks/use-articles";
import { ArticleStatusChip } from "./article-status";

/** Stands for "no collection" in the list of choices, where a value cannot be empty. */
const NONE = "none";

const failures: Record<Exclude<ChangeArticleResult, { ok: true }>["reason"], string> = {
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

export interface ArticleEditorProps {
  articleId: string;
}

/** The page where one article is written, put in a collection and published. */
export function ArticleEditor({ articleId }: ArticleEditorProps) {
  const getClient = useHelpwren();
  return (
    <div className="h-full p-2">
      <QueryDetail
        queryKey={[...ARTICLES_QUERY_KEY, "detail", articleId]}
        queryFn={() => getClient().articles.get(articleId)}
        // The form keeps its own copy once loaded, so a refresh must not disturb the writing.
        staleTime={Infinity}
        messages={{ loading: "Opening the article" }}
        className="border-rule bg-card h-full overflow-hidden rounded-xl border"
        // The page inside scrolls in its own columns, so it needs the card's full height.
        contentClassName="h-full"
        renderEmpty={() => (
          <EmptyState
            scene="not-found"
            title="This article does not exist"
            description="It may have been removed."
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href={HELP_PATH}>Back to the help center</Link>
              </Button>
            }
          />
        )}
      >
        {(article) => <EditorForm key={article.id} article={article} />}
      </QueryDetail>
    </div>
  );
}

function EditorForm({ article }: { article: Article }) {
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
  const dirty =
    body !== null ||
    title !== saved.title ||
    summary !== (saved.summary ?? "") ||
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
    setSlugError(undefined);
    const changes: ArticleChanges = {};
    if (title !== saved.title) {
      if (!title.trim()) {
        toast.error("Give the article a title.");
        return null;
      }
      changes.title = title;
    }
    if (summary !== (saved.summary ?? "")) changes.summary = summary;
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

    try {
      const result = await getClient().articles.update(saved.id, changes);
      if (!result.ok) {
        if (result.reason === "slug_taken") setSlugError(failures.slug_taken);
        else toast.error(failures[result.reason]);
        return null;
      }
      setSaved(result.article);
      setTitle(result.article.title);
      setSummary(result.article.summary ?? "");
      setSlug(result.article.slug);
      setTags(result.article.tags);
      setMetaTitle(result.article.metaTitle ?? "");
      setMetaDescription(result.article.metaDescription ?? "");
      setBody(null);
      await changed();
      return result.article;
    } catch {
      toast.error("The article could not be saved. Try again.");
      return null;
    }
  }, [
    authorId,
    body,
    changed,
    collectionId,
    featured,
    getClient,
    metaDescription,
    metaTitle,
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
      <header className="border-rule flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b px-3 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-1.5"
          onClick={() => void leave()}
        >
          <Icon name="arrow-left" />
          Help center
        </Button>
        <span className="flex-1" />
        <p role="status" className="text-muted-foreground text-xs">
          {dirty ? "Unsaved changes" : `Saved ${formatTimeAgo(saved.updatedAt)}`}
        </p>
        <ArticleStatusChip status={saved.status} />
        <Tooltip content={dirty ? "Shows the article as last saved" : "See it as a visitor will"}>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/help/preview/${saved.id}`} target="_blank" rel="noreferrer">
              <Icon name="eye" />
              Preview
            </a>
          </Button>
        </Tooltip>
        <Button
          variant="secondary"
          size="sm"
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
            disabled={busy !== null}
            loading={busy === "publish"}
            onClick={() => void setPublished(false)}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy !== null}
            loading={busy === "publish"}
            onClick={() => void setPublished(true)}
          >
            Publish
          </Button>
        )}
        <Tooltip content="Remove article">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove article"
            disabled={busy !== null}
            onClick={() => void remove()}
          >
            <Icon name="trash" />
          </Button>
        </Tooltip>
      </header>

      <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
        <div className="min-w-0 flex-1 lg:overflow-y-auto">
          {/* Wide margins: the controls that appear beside a block sit in the left one. */}
          <div className="mx-auto max-w-3xl px-6 py-8 sm:px-16">
            <Textarea
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
