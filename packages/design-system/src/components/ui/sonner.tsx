"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Icon } from "#components/base/icon/icon"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: (
          <Icon name="check-circle" className="size-4" />
        ),
        info: (
          <Icon name="info" className="size-4" />
        ),
        warning: (
          <Icon name="warning" className="size-4" />
        ),
        error: (
          <Icon name="x-circle" className="size-4" />
        ),
        loading: (
          <Icon name="spinner" className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
