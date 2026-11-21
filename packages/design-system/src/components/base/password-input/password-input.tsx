"use client";

import { useState } from "react";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { Input, type InputProps } from "../input/input";

export interface PasswordInputProps extends Omit<
  InputProps,
  "type" | "append" | "currency" | "formatter"
> {
  /**
   * `current-password` where someone signs in, `new-password` where they choose one, so a
   * password manager fills the first and offers to save the second.
   */
  autoComplete?: "current-password" | "new-password";
}

/**
 * A password box with a lock at its start, like the other fields' icons, and a button that
 * shows what was typed, for checking it before sending.
 */
export function PasswordInput({
  autoComplete = "current-password",
  disabled,
  prepend = <Icon name="lock" />,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      prepend={prepend}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
      disabled={disabled}
      append={
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mr-2"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => {
            setVisible(!visible);
          }}
        >
          <Icon name={visible ? "eye-slash" : "eye"} />
        </Button>
      }
    />
  );
}
