import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Base/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase() {
  return (
    <Tabs defaultValue="chat" className="max-w-sm">
      <TabsList aria-label="Conversation type">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="tickets">Tickets</TabsTrigger>
        <TabsTrigger value="archived" disabled>
          Archived
        </TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="text-sm">
        Three open chats.
      </TabsContent>
      <TabsContent value="tickets" className="text-sm">
        One ticket waiting on the customer.
      </TabsContent>
    </Tabs>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };

const sections = [
  "Overview",
  "Conversations",
  "Tickets",
  "Articles",
  "Contacts",
  "Canned replies",
  "Help rules",
  "Settings",
  "Billing",
] as const;

/**
 * When the tabs do not fit, the row scrolls sideways. Choosing a tab slides the
 * indicator to it and brings it to the centre.
 */
export const Scrollable: Story = {
  render: () => (
    <Tabs defaultValue="Overview" className="max-w-sm">
      <TabsList aria-label="Section">
        {sections.map((section) => (
          <TabsTrigger key={section} value={section}>
            {section}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsContent key={section} value={section} className="text-sm">
          {section}
        </TabsContent>
      ))}
    </Tabs>
  ),
};
