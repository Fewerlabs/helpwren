import { useEffect, useState } from "react";

/** A value that follows another after it has stopped changing, so typing does not fire a request per key. */
export function useDebounced<Value>(value: Value, delayMs = 250): Value {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
