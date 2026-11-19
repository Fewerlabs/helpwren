import {
  ArticleCard,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  CodeSnippet,
  ConversationListItem,
  EmptyState,
  Highlight,
  Icon,
  Input,
  Kbd,
  Label,
  Link,
  Logo,
  MarginNote,
  MessageBubble,
  PageHeader,
  PhoneInput,
  StatusChip,
  statusNames,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TagsInput,
  ThemeMenu,
  Wren,
  wrenScenes,
} from "@helpwren/design-system";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CannedReplies } from "@/features/example";

export const metadata: Metadata = {
  title: "Design system",
  description: "The Helpwren design system, running in the app.",
};

const palette = [
  { name: "paper", label: "Paper" },
  { name: "card-surface", label: "Card" },
  { name: "ink", label: "Ink" },
  { name: "pencil", label: "Pencil" },
  { name: "edge", label: "Edge" },
  { name: "rule", label: "Rule" },
  { name: "moss", label: "Moss" },
  { name: "pen", label: "Red pen" },
  { name: "highlighter", label: "Highlighter" },
  { name: "biro", label: "Biro" },
  { name: "ochre", label: "Ochre" },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-5">
      <h2 id={id} className="text-muted-foreground text-2xs font-mono tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-16 px-6 py-12">
      <PageHeader
        eyebrow="Helpwren"
        title="Design system"
        description="Calm interface, hand-drawn character. Every piece on this page comes from @helpwren/design-system, running in the real app."
        actions={<ThemeMenu className="border-rule hover:bg-muted size-9 rounded-lg border" />}
      />

      <Section id="brand" title="Brand">
        <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
          <Logo variant="lockup" size={72} />
          <Logo size={32} />
          <Logo size={16} />
          <MarginNote arrow="up-left">small bird, big voice</MarginNote>
        </div>
        <p className="max-w-2xl text-2xl font-semibold tracking-tight text-balance">
          Live chat on your site in <Highlight>ten minutes</Highlight>, and it is{" "}
          <Highlight variant="pen">yours</Highlight>.
        </p>
      </Section>

      <Section id="colour" title="Colour">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
          {palette.map((colour) => (
            <li key={colour.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="border-line size-10 shrink-0 rounded-lg"
                style={{ backgroundColor: `var(--${colour.name})` }}
              />
              <span className="text-sm">{colour.label}</span>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap gap-2">
          {statusNames.map((status) => (
            <li key={status}>
              <StatusChip status={status} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="type" title="Type">
        <div className="grid gap-2">
          <p className="text-3xl font-semibold tracking-tight">All caught up.</p>
          <p className="text-base">We&apos;ll reply here and by email.</p>
          <p className="text-muted-foreground text-sm">
            Plain words, short sentences, a little warmth.
          </p>
          <p className="font-mono text-xs">
            Helpwren.init({"{"} source: &quot;web&quot; {"}"})
          </p>
        </div>
      </Section>

      <Section id="controls" title="Controls">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Send reply</Button>
          <Button variant="secondary">Assign</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete</Button>
          <Button size="sm" variant="secondary">
            Small
          </Button>
          <Button disabled>Disabled</Button>
          <Badge>billing</Badge>
          <Badge variant="outline">ios</Badge>
          <Kbd>⌘K</Kbd>
          <Link href="/help">A link</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="design-email">Email</Label>
            <Input
              id="design-email"
              type="email"
              placeholder="you@example.com"
              prepend={<Icon name="envelope" className="size-4" />}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="design-budget">Budget</Label>
            <Input id="design-budget" currency prepend="$" defaultValue={12500} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="design-phone">Phone</Label>
            <PhoneInput id="design-phone" defaultCountry="GB" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="design-tags">Tags</Label>
            <TagsInput id="design-tags" defaultValue={["billing", "refunds"]} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Label>
            <Checkbox defaultChecked />
            Ask for email before chat
          </Label>
          <Label>
            <Switch defaultChecked />
            Email notifications
          </Label>
        </div>
        <Tabs defaultValue="chat">
          <TabsList aria-label="Conversation type">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="text-sm">
            Three open chats.
          </TabsContent>
          <TabsContent value="tickets" className="text-sm">
            One ticket waiting on the customer.
          </TabsContent>
          <TabsContent value="articles" className="text-sm">
            Twelve published articles.
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="conversations" title="Conversations">
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="border-line bg-card flex flex-col gap-0.5 self-start rounded-2xl p-1.5">
            <li>
              <ConversationListItem
                href="/dashboard/inbox"
                name="Ada Lovelace"
                preview="I was charged twice for my booking"
                time="2m"
                status="urgent"
                unread={2}
              />
            </li>
            <li>
              <ConversationListItem
                href="/dashboard/inbox"
                name="Grace Hopper"
                preview="Thanks, that fixed it"
                time="1h"
                status="resolved"
                selected
              />
            </li>
            <li>
              <ConversationListItem
                href="/dashboard/inbox"
                name="Alan Turing"
                preview="Can I move my booking to Tuesday?"
                time="Mon"
                status="waiting"
              />
            </li>
          </ul>
          <div className="border-line bg-card flex flex-col gap-3 rounded-2xl p-4">
            <MessageBubble from="other" author="Ada Lovelace" time="10:02">
              Hi, I was charged twice for my booking on Friday.
            </MessageBubble>
            <MessageBubble from="self" time="10:04" footer="Seen">
              Sorry about that. I&apos;ve refunded one of the payments.
            </MessageBubble>
            <MessageBubble from="self" note time="10:05">
              Duplicate charge caused by a retry. Raised with engineering.
            </MessageBubble>
          </div>
        </div>
      </Section>

      <Section id="help" title="Help center">
        <div className="grid gap-4 sm:grid-cols-2">
          <ArticleCard
            href="/help"
            category="Billing"
            title="How refunds work"
            summary="When a refund is issued, how long it takes to arrive, and what to do if it has not."
            meta="Updated 3 days ago"
          />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Avatar name="Acme" size="sm" />
                Install the widget
              </CardTitle>
              <CardDescription>Paste this once, before the closing body tag.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeSnippet
                language="HTML"
                code={'<script src="https://support.acme.example/widget.js"></script>'}
              />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="illustrations" title="Illustrations">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
          {wrenScenes.map((scene) => (
            <li key={scene} className="border-line bg-card rounded-2xl p-5">
              <Wren scene={scene} className="mx-auto" />
            </li>
          ))}
        </ul>
        <div className="border-line bg-card rounded-2xl">
          <EmptyState
            scene="help-articles"
            title="No articles match"
            description="Try a different word, or browse the categories."
            action={<Button variant="secondary">Clear search</Button>}
            headingLevel={3}
          />
        </div>
      </Section>

      <CannedReplies />
    </main>
  );
}
