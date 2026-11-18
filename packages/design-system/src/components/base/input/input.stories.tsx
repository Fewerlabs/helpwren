import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../button/button";
import { Field } from "../field/field";
import { Icon } from "../icon/icon";
import { Kbd } from "../kbd/kbd";
import type { InputFormatter } from "./format";
import { Input } from "./input";

const meta = {
  title: "Base/Input",
  component: Input,
  args: { placeholder: "you@example.com", "aria-label": "Email" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function States() {
  return (
    <div className="grid max-w-sm gap-5">
      <Field label="Email">
        <Input type="email" placeholder="you@example.com" />
      </Field>
      <Field label="Name" hint="Shown to the support team.">
        <Input defaultValue="Ada Lovelace" />
      </Field>
      <Field label="Email" error="Enter an email address, like name@example.com.">
        <Input type="email" defaultValue="ada@" />
      </Field>
      <Field label="Ticket number">
        <Input defaultValue="1042" disabled />
      </Field>
    </div>
  );
}

export const Overview: Story = { render: () => <States /> };
export const Dark: Story = { render: () => <States />, globals: { theme: "dark" } };

function Addons() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid max-w-sm gap-5">
      <Field label="Search articles">
        <Input
          type="search"
          placeholder="Refunds, billing, login"
          prepend={<Icon name="magnifying-glass" className="size-4" />}
          append={<Kbd>⌘K</Kbd>}
        />
      </Field>
      <Field label="Help center address">
        <Input defaultValue="glown" prepend="https://" append=".helpwren.app" />
      </Field>
      <Field label="Signing secret">
        <Input
          type={visible ? "text" : "password"}
          defaultValue="hw_test_secret"
          prepend={<Icon name="lock" className="size-4" />}
          append={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-2"
              aria-label={visible ? "Hide secret" : "Show secret"}
              onClick={() => {
                setVisible(!visible);
              }}
            >
              <Icon name={visible ? "eye-slash" : "eye"} />
            </Button>
          }
        />
      </Field>
    </div>
  );
}

/** `prepend` and `append` take anything: icons, text, keys or buttons. */
export const PrependAndAppend: Story = { render: () => <Addons /> };

function Money() {
  const [amount, setAmount] = useState("1000");
  return (
    <div className="grid max-w-sm gap-5">
      <Field label="Refund amount" hint={`Raw value passed to your code: "${amount}"`}>
        <Input currency prepend="$" value={amount} onValueChange={setAmount} />
      </Field>
      <Field label="Seats" hint="Whole numbers only.">
        <Input currency={{ decimals: 0 }} defaultValue={12500} />
      </Field>
      <Field label="Betrag" hint="German separators: 1.234,56">
        <Input currency={{ locale: "de-DE" }} append="€" defaultValue="1234.56" />
      </Field>
    </div>
  );
}

/** `currency` groups digits as you type. Your code always receives the plain number. */
export const Currency: Story = { render: () => <Money /> };

const cardNumber: InputFormatter = {
  parse: (display) => display.replace(/\D/g, "").slice(0, 16),
  format: (raw) => raw.replace(/(\d{4})(?=\d)/g, "$1 "),
};

/** Any other format is a `formatter`: a pair of functions between raw value and display. */
export const CustomFormatter: Story = {
  render: () => (
    <div className="max-w-sm">
      <Field label="Reference number" hint="Sixteen digits, shown in groups of four.">
        <Input formatter={cardNumber} inputMode="numeric" defaultValue="1234567812345678" />
      </Field>
    </div>
  ),
};
