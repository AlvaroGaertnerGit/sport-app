import { EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME } from "./layout";
import { Parallax } from "./motion/parallax";
import { ScopeMark } from "@/components/ui/scope-mark";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className={`flex items-center justify-between ${LANDING_CONTAINER_CLASSNAME}`}>
        <div className="flex items-center gap-3">
          <Parallax speed={0.04} maxOffsetPx={10}>
            <ScopeMark size={32} className="size-8" />
          </Parallax>
          <p className={EYEBROW_CLASSNAME}>Sport Coach — Entrena con intención.</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
