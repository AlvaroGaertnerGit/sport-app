"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import type { ScopeDockConfig } from "./scope-docks"
import { useScopeDockContext } from "./scope-dock-context"

interface ScopeDockProps extends Omit<React.ComponentProps<"div">, "id"> {
  id: string
  config?: ScopeDockConfig
}

// The layout-side half of the companion system. Renders an invisible
// placeholder occupying the visual slot Scope should rest in and registers
// itself with ScopeDockProvider — the actual <Scope> is one shared instance
// rendered by CompanionScope, which measures this element's position and
// travels there. Size this element exactly the way Scope should read while
// resting here (e.g. `size-40 sm:size-48`).
//
// Registration runs in a layout effect, not a plain effect, so it resolves
// before the browser's first paint — see companion-scope.tsx's own
// useLayoutEffect for why (together they avoid a visible flash at (0,0)
// on first load).
//
// Deliberately never placed inside an element with its own competing
// `transform` (this project's landing `Reveal`/`Parallax`) — CompanionScope
// only re-measures a dock's position on `activeDockId` change or window
// resize, not when a sibling's own scroll-reveal/parallax transform
// settles, so a transformed dock slot would strand the real Scope at that
// wrapper's pre-animation offset. See each landing call site's own comment.
function ScopeDock({ id, config, className, ...props }: ScopeDockProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const { registerDock, unregisterDock, updateDockConfig } = useScopeDockContext()

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    registerDock(id, element, config ?? {})
    return () => unregisterDock(id)
    // config is only the *initial* config at registration — docks describe a
    // fixed resting spot for almost every caller, but see the effect below
    // for a config that legitimately changes after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registerDock, unregisterDock])

  // Keyed on the individual config fields, not the `config` object
  // reference — every call site can pass a fresh object literal (e.g.
  // `config={{ mood: "idle" }}`) on every render, which would fire this
  // effect on every single render if it depended on the object itself.
  // Keying on the primitive values means it only fires when a value
  // genuinely changes.
  React.useEffect(() => {
    updateDockConfig(id, config ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, config?.mood, config?.scale, config?.facing, config?.attentionTarget, updateDockConfig])

  return (
    <div
      ref={ref}
      data-slot="scope-dock"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      {...props}
    />
  )
}

export { ScopeDock }
