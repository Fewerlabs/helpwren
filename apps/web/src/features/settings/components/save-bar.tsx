import { Button, toast } from "@helpwren/design-system";
import { useEffect } from "react";

export interface SaveBarProps {
  saving: boolean;
  /** True once the latest changes have been saved and nothing has been edited since. */
  saved: boolean;
  dirty: boolean;
  error: string | undefined;
}

/** The Save button at the foot of a settings form, and what happened when it was last pressed. */
export function SaveBar({ saving, saved, dirty, error }: SaveBarProps) {
  // Each form reports a save by flipping these, so the toasts are raised here, once for all
  // of them. The text beside the button stays: it is still there after the toast has gone.
  useEffect(() => {
    if (saved) toast.success("Changes saved");
  }, [saved]);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div className="border-rule flex items-center justify-end gap-3 border-t pt-5">
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : saved && !dirty ? (
        <p role="status" className="text-muted-foreground">
          Saved.
        </p>
      ) : null}
      <Button type="submit" size="sm" loading={saving} disabled={!dirty}>
        Save changes
      </Button>
    </div>
  );
}

export const saveErrors = {
  forbidden: "Only admins can change settings.",
  invalid: "Check the values and try again.",
  failed: "The changes could not be saved. Try again.",
} as const;
