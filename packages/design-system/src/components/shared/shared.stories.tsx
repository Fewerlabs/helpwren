import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../base/button/button";
import { Icon } from "../base/icon/icon";
import { Toaster } from "../base/toast/toast";
import { ArticleCard } from "./article-card/article-card";
import { CodeSnippet } from "./code-snippet/code-snippet";
import { ConversationListItem } from "./conversation-list-item/conversation-list-item";
import { EmptyState } from "./empty-state/empty-state";
import { Highlight } from "./highlight/highlight";
import { MarginNote } from "./margin-note/margin-note";
import { MessageBubble } from "./message-bubble/message-bubble";
import { PageHeader } from "./page-header/page-header";
import { SearchField } from "./search-field/search-field";

const meta: Meta = { title: "Shared/Overview" };

export default meta;
type Story = StoryObj;

export const EmptyStates: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="border-line bg-card rounded-2xl">
        <EmptyState
          title="All caught up"
          description="Nothing is waiting for a reply. New conversations appear here."
          action={<Button variant="secondary">View resolved</Button>}
        />
      </div>
      <div className="border-line bg-card rounded-2xl">
        <EmptyState
          scene="help-articles"
          title="No articles match"
          description="Try a different word, or browse the categories."
          action={<Button variant="secondary">Clear search</Button>}
        />
      </div>
      <div className="border-line bg-card rounded-2xl sm:col-span-2">
        <EmptyState
          size="sm"
          scene="conversations"
          title="No messages yet"
          description="Say hello to start the conversation."
        />
      </div>
    </div>
  ),
};

export const SearchFields: Story = {
  render: () => (
    <div className="grid max-w-sm gap-4">
      <SearchField aria-label="Search articles" placeholder="Search articles" shortcut="⌘K" />
      <SearchField aria-label="Search conversations" defaultValue="refund" />
      <SearchField aria-label="Search contacts" defaultValue="ada" loading />
    </div>
  ),
};

export const PageHeaders: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-10">
      <PageHeader
        eyebrow="#open · 12"
        title="Inbox"
        description="Conversations waiting for a reply from the team."
        actions={
          <>
            <Button variant="secondary">
              <Icon name="funnel" />
              Filter
            </Button>
            <Button>
              <Icon name="plus" />
              New conversation
            </Button>
          </>
        }
      />
      <PageHeader
        headingLevel={2}
        title="Allowed domains"
        description="The widget only loads here."
      />
    </div>
  ),
};

const widgetUrl = "https://support.acme.example/widget.js";

const installTabs = [
  {
    label: "HTML",
    language: "html",
    code: `<!-- Before the closing body tag -->
<script src="${widgetUrl}"></script>
<script>
  Helpwren.init({ source: "web" });
</script>`,
  },
  {
    label: "React",
    language: "jsx",
    code: `import { useEffect } from "react";

export function HelpwrenChat() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${widgetUrl}";
    script.onload = () => window.Helpwren.init({ source: "web" });
    document.body.append(script);
    return () => script.remove();
  }, []);

  return null;
}`,
  },
  {
    label: "Shell",
    language: "shell",
    code: "# Or let the CLI add it\nnpx @helpwren/cli install --app-url https://support.acme.example",
  },
];

function CodeSnippetShowcase() {
  return (
    <div className="grid max-w-xl gap-4">
      <CodeSnippet tabs={installTabs} tabsLabel="Ways to install" copiedMessage="Snippet copied" />
      <CodeSnippet
        language="HTML"
        code={`<script src="${widgetUrl}"></script>\n<script>\n  Helpwren.init({ source: "web" });\n</script>`}
      />
      <CodeSnippet language="tsx" lineNumbers code={installTabs[1]?.code ?? ""} />
      <CodeSnippet
        language="Shell"
        wrap
        code="npx @helpwren/cli install --database-url postgres://user:password@db.example.com:5432/helpwren --app-url https://support.example.com"
      />
      <CodeSnippet
        language="Shell"
        code="npx @helpwren/cli install --database-url postgres://user:password@db.example.com:5432/helpwren --app-url https://support.example.com"
      />
      <CodeSnippet
        variant="inline"
        aria-label="Chat page link"
        code="https://support.acme.example/chat"
        copyLabel="Copy link"
        copiedLabel="Link copied"
        openHref="https://support.acme.example/chat"
      />
      <Toaster />
    </div>
  );
}

export const CodeSnippets: Story = { render: () => <CodeSnippetShowcase /> };
export const CodeSnippetsDark: Story = {
  render: () => <CodeSnippetShowcase />,
  globals: { theme: "dark" },
};

function Thread() {
  return (
    <div className="border-line bg-card flex max-w-md flex-col gap-3 rounded-2xl p-4">
      <MessageBubble from="other" author="Ada Lovelace" time="10:02">
        Hi, I was charged twice for my booking on Friday.
      </MessageBubble>
      <MessageBubble from="self" time="10:04" footer="Seen">
        Sorry about that. I can see both payments and have refunded one. It should reach you in two
        to three days.
      </MessageBubble>
      <MessageBubble from="self" note time="10:05">
        Duplicate charge caused by a retry on the payment page. Raised with engineering.
      </MessageBubble>
      <MessageBubble from="other" author="Ada Lovelace" time="10:06">
        Thank you!
      </MessageBubble>
    </div>
  );
}

/** Your own messages are filled and on the right; the other person's are outlined and on the left. */
export const MessageBubbles: Story = { render: () => <Thread /> };

export const ConversationList: Story = {
  render: () => (
    <ul className="border-line bg-card flex max-w-sm flex-col gap-0.5 rounded-2xl p-1.5">
      <li>
        <ConversationListItem
          href="https://helpwren.fewerlabs.dev"
          name="Ada Lovelace"
          preview="I was charged twice for my booking"
          time="2m"
          status="urgent"
          unread={2}
        />
      </li>
      <li>
        <ConversationListItem
          href="https://helpwren.fewerlabs.dev"
          name="Grace Hopper"
          preview="Thanks, that fixed it"
          time="1h"
          status="resolved"
          selected
        />
      </li>
      <li>
        <ConversationListItem
          name="Alan Turing"
          preview="Can I move my booking to Tuesday?"
          time="Mon"
          status="waiting"
        />
      </li>
    </ul>
  ),
};

export const ArticleCards: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <ArticleCard
        href="https://helpwren.fewerlabs.dev"
        category="Billing"
        title="How refunds work"
        summary="When a refund is issued, how long it takes to arrive, and what to do if it has not."
        meta="Updated 3 days ago"
      />
      <ArticleCard
        href="https://helpwren.fewerlabs.dev"
        category="Bookings"
        title="Change or cancel a booking"
        summary="Move a booking to another time, or cancel it and see what is refunded."
      />
    </div>
  ),
};

/** For the marketing site and the docs only. The product interface stays calm. */
export const MarksAndNotes: Story = {
  render: () => (
    <div className="grid max-w-xl gap-8">
      <p className="text-3xl font-semibold tracking-tight text-balance">
        Live chat on your site in <Highlight>ten minutes</Highlight>, and it is{" "}
        <Highlight variant="pen">free</Highlight>.
      </p>
      <div className="flex flex-wrap gap-10">
        <MarginNote>small bird, big voice</MarginNote>
        <MarginNote arrow="up-left">paste this once</MarginNote>
        <MarginNote arrow="none">no arrow needed</MarginNote>
      </div>
    </div>
  ),
};

export const Dark: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <PageHeader eyebrow="#open" title="Inbox" actions={<Button>New</Button>} />
      <SearchField aria-label="Search" shortcut="⌘K" />
      <Thread />
      <div className="border-line bg-card rounded-2xl">
        <EmptyState
          size="sm"
          animate={false}
          title="All caught up"
          description="Nothing waiting."
        />
      </div>
    </div>
  ),
  globals: { theme: "dark" },
};
