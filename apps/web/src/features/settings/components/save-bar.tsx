import { Button } from "@helpwren/design-system";

export interface SaveBarProps {
  saving: boolean;
  /** True once the latest changes have been saved and nothing has been edited since. */
  saved: boolean;
  dirty: boolean;
  error: string | undefined;
}

/** The Save button at the foot of a settings form, and what happened when it was last pressed. */
export function SaveBar({ saving, saved, dirty, error }: SaveBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" loading={saving} disabled={!dirty}>
        Save changes
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : saved && !dirty ? (
        <p role="status" className="text-muted-foreground text-sm">
          Saved.
        </p>
      ) : null}
    </div>
  );
}

export const saveErrors = {
  forbidden: "Only admins can change settings.",
  invalid: "Check the values and try again.",
  failed: "The changes could not be saved. Try again.",
} as const;
