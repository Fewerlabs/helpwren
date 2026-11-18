import { useEffect, useRef, useState } from "react";

export type ComboboxResolver<Option, Value> = (
  values: readonly Value[],
  signal: AbortSignal,
) => Promise<readonly Option[]>;

/**
 * Finds the options behind selected values that are not in any loaded list yet,
 * which is the normal case when a form is prefilled with ids and the list is
 * loaded from a server. Missing values are requested once, in one batch.
 */
export function useResolvedOptions<Option, Value>({
  values,
  isKnown,
  resolver,
  getOptionValue,
}: {
  values: readonly Value[];
  isKnown: (value: Value) => boolean;
  resolver: ComboboxResolver<Option, Value> | undefined;
  getOptionValue: (option: Option) => Value;
}): { resolved: ReadonlyMap<Value, Option>; pending: ReadonlySet<Value> } {
  const [resolved, setResolved] = useState<ReadonlyMap<Value, Option>>(new Map());
  const [pending, setPending] = useState<ReadonlySet<Value>>(new Set());
  const attempted = useRef(new Set<Value>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!resolver) {
      return;
    }
    const missing = values.filter((value) => !isKnown(value) && !attempted.current.has(value));
    if (missing.length === 0) {
      return;
    }
    for (const value of missing) {
      attempted.current.add(value);
    }
    // Not cancelled when the selection changes: a lookup that is under way is still wanted.
    const controller = new AbortController();
    setPending((previous) => new Set([...previous, ...missing]));

    resolver(missing, controller.signal)
      .then((options) => {
        if (mounted.current) {
          setResolved((previous) => {
            const next = new Map(previous);
            for (const option of options) {
              next.set(getOptionValue(option), option);
            }
            return next;
          });
        }
      })
      .catch(() => {
        // The value stays selected and is shown as its raw id; see `messages.resolving`.
      })
      .finally(() => {
        if (mounted.current) {
          setPending(
            (previous) => new Set([...previous].filter((value) => !missing.includes(value))),
          );
        }
      });
  }, [values, isKnown, resolver, getOptionValue]);

  return { resolved, pending };
}
