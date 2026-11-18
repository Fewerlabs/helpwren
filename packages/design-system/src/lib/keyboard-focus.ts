"use client";

import { useEffect, useState, type FocusEvent } from "react";

// Browsers treat every focused text input as "focus-visible", even after a click,
// so CSS alone cannot tell a click from the Tab key. This remembers which the
// person last used.
let lastInputWasKeyboard = false;
let tracking = false;

function track() {
  if (tracking || typeof document === "undefined") {
    return;
  }
  tracking = true;
  document.addEventListener(
    "keydown",
    () => {
      lastInputWasKeyboard = true;
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    () => {
      lastInputWasKeyboard = false;
    },
    true,
  );
}

interface KeyboardFocus {
  /** True while the control holds focus that arrived from the keyboard. */
  keyboardFocus: boolean;
  onFocus: (event: FocusEvent) => void;
  onBlur: () => void;
}

/**
 * Tells a text control whether it was focused with the keyboard, so it can show
 * its focus ring for Tab but only a border colour for a click. `accepts` limits
 * which focused element counts, for a box that holds more than the input.
 */
export function useKeyboardFocus(
  accepts: (target: Element) => boolean = () => true,
): KeyboardFocus {
  const [keyboardFocus, setKeyboardFocus] = useState(false);

  useEffect(() => {
    track();
  }, []);

  return {
    keyboardFocus,
    onFocus: (event) => {
      setKeyboardFocus(lastInputWasKeyboard && accepts(event.target));
    },
    onBlur: () => {
      setKeyboardFocus(false);
    },
  };
}
