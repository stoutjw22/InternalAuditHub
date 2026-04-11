import * as React from "react"
import { InboxIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  description?: string
}

function Empty({
  className,
  message = "No results found",
  description,
  ...props
}: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className
      )}
      {...props}
    >
      <div className="rounded-full bg-muted p-4">
        <InboxIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export { Empty }
