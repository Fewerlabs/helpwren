"use client";

import { toast } from "@helpwren/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  useWatch,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormReturn,
} from "react-hook-form";

import { saveErrors } from "./save-bar";

type SaveResult = { ok: true } | { ok: false; reason: keyof typeof saveErrors };

/**
 * Saves the named switches the moment they are flipped, as Intercom and Featurebase do, while
 * the rest of the form keeps its Save button. A flip is saved with the values last saved for
 * everything else, so text still being typed elsewhere is neither sent nor lost, and the Save
 * button goes on tracking it. A refused save puts the switch back and says why.
 */
export function useInstantSwitches<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  names: readonly Path<Values>[],
  save: (values: Values) => Promise<SaveResult>,
): void {
  const router = useRouter();
  const current = useWatch({ control: form.control, name: names });
  const saving = useRef(new Set<string>());

  useEffect(() => {
    const saved = form.formState.defaultValues as Values | undefined;
    if (!saved) return;
    names.forEach((name, index) => {
      const value = current[index] as PathValue<Values, Path<Values>>;
      const before = saved[name] as PathValue<Values, Path<Values>>;
      if (value === before || saving.current.has(name)) return;
      saving.current.add(name);
      void save({ ...saved, [name]: value })
        .then((result) => {
          if (result.ok) {
            // The new value becomes the saved one, so the Save button does not count it.
            form.resetField(name, { defaultValue: value });
            toast.success("Saved");
            router.refresh();
          } else {
            form.resetField(name, { defaultValue: before });
            toast.error(saveErrors[result.reason]);
          }
        })
        .catch(() => {
          form.resetField(name, { defaultValue: before });
          toast.error(saveErrors.failed);
        })
        .finally(() => {
          saving.current.delete(name);
        });
    });
  }, [current, form, names, router, save]);
}
