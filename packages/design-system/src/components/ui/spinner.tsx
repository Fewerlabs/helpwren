import { cn } from "#lib/cn"
import { Icon } from "#components/base/icon/icon"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Icon label="Loading" data-slot="spinner" role="status" className={cn("size-4 animate-spin", className)} {...props} name="spinner" />
  )
}

export { Spinner }
