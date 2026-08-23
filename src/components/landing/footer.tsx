import { EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME } from "./layout";
import { ScopeMark } from "./scope-mark";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className={`flex items-center justify-between ${LANDING_CONTAINER_CLASSNAME}`}>
        <div className="flex items-center gap-3">
          <ScopeMark size={32} className="size-8" />
          <p className={EYEBROW_CLASSNAME}>Sport Coach — Entrena con intención.</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
