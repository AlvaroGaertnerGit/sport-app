import type { ReactNode } from "react";

import { EYEBROW_CLASSNAME } from "@/components/ui/typography";

/**
 * Shared shape for every /legal page — one component owns the repeated
 * header (eyebrow, title, "última actualización"), one owns a numbered
 * section — rather than five pages each hand-rolling the same header block
 * (the project's own "regla de tres": five near-identical repeats is
 * exactly the trigger to extract this). Deliberately not a markdown/prose
 * renderer -- section bodies stay plain JSX (`<p>`, `<table>`, `<code>`),
 * so a page can drop in whatever real content it needs (a table, a
 * component like CookieSettingsPanel) without a second templating layer.
 */
export function LegalArticle({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article>
      <p className={EYEBROW_CLASSNAME}>{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">Última actualización: {updated}</p>
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-elevated [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground [&_p]:leading-relaxed [&_strong]:text-foreground">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={id ? "scroll-mt-8" : undefined}>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

/** Highlighted callout for placeholders/legal-review notes -- never silently blended into body text (brief §31/§43: these must stay visibly distinct, never look "finished"). */
export function LegalNote({ children, tone = "pending" }: { children: ReactNode; tone?: "pending" | "review" }) {
  const toneClassName =
    tone === "pending"
      ? "border-primary/40 bg-primary/5 text-foreground"
      : "border-border bg-elevated text-muted-foreground";
  return <p className={`rounded-md border px-4 py-3 text-sm leading-relaxed ${toneClassName}`}>{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
}

export function LegalLi({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

export function LegalTable({ head, rows }: { head: readonly string[]; rows: readonly (readonly ReactNode[])[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
            {head.map((h) => (
              <th key={h} className="py-2 pr-3 font-mono">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border align-top last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-3 text-foreground last:pr-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
