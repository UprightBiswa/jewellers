import type { ReactNode } from "react";

/**
 * A deliberately small Markdown renderer for owner-written policy pages.
 *
 * It produces React elements rather than an HTML string, so nothing the owner
 * types can inject markup — no sanitizer to keep current, no dangerouslySetInnerHTML.
 * It handles what the policy pages actually use: headings, paragraphs, bullet
 * lists, bold, and links. Anything else renders as plain text, which is the
 * right failure for a shop owner writing in a textarea.
 */

type Inline = { bold?: boolean; href?: string; text: string };

function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  // Alternates on **bold** and [label](href)
  const pattern = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(line)) !== null) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) });

    if (m[2] !== undefined) {
      out.push({ text: m[2], bold: true });
    } else if (m[4] !== undefined && m[5] !== undefined) {
      const href = m[5];
      // Only http(s), mailto, tel and site-relative links survive.
      const safe = /^(https?:\/\/|mailto:|tel:|\/)/i.test(href) ? href : "#";
      out.push({ text: m[4], href: safe });
    }
    last = pattern.lastIndex;
  }

  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

function renderInline(parts: Inline[]): ReactNode[] {
  return parts.map((p, i) => {
    if (p.href) {
      const external = /^https?:\/\//i.test(p.href);
      return (
        <a
          key={i}
          href={p.href}
          className="text-brand underline underline-offset-4"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {p.text}
        </a>
      );
    }
    if (p.bold) return <strong key={i} className="font-semibold text-ink">{p.text}</strong>;
    return <span key={i}>{p.text}</span>;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p${blocks.length}`} className="text-[15px] leading-relaxed text-ink-2">
        {renderInline(parseInline(paragraph.join(" ")))}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul${blocks.length}`} className="grid list-disc gap-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
        {list.map((item, i) => (
          <li key={i}>{renderInline(parseInline(item))}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading?.[1] && heading[2]) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = renderInline(parseInline(heading[2]));
      const cls =
        level <= 2
          ? "font-display text-2xl text-ink mt-8 first:mt-0"
          : "font-display text-xl text-ink mt-6";
      blocks.push(
        level <= 2 ? (
          <h2 key={`h${blocks.length}`} className={cls}>{text}</h2>
        ) : (
          <h3 key={`h${blocks.length}`} className={cls}>{text}</h3>
        ),
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet?.[1]) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return <div className="grid gap-4">{blocks}</div>;
}
