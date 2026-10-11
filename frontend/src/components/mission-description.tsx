import { Fragment, type ReactNode } from "react";

type Block = { kind: "p"; text: string } | { kind: "ol" | "ul"; items: string[] };

const ORDERED = /^\d+\.\s+/;
const BULLET = /^[-*]\s+/;

/**
 * Mission descriptions are hard-wrapped text. Wrapped lines are re-joined into paragraphs (so they reflow with the panel
 * width, as on LeetCode), "1." / "-" lines become lists, and blank lines start a new paragraph.
 */
function toBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const last = blocks.at(-1);
    if (!line) {
      blocks.push({ kind: "p", text: "" });
      continue;
    }
    const kind = ORDERED.test(line) ? "ol" : BULLET.test(line) ? "ul" : null;
    if (kind) {
      const item = line.replace(kind === "ol" ? ORDERED : BULLET, "");
      if (last?.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (last?.kind === "p" && last.text) {
      last.text += ` ${line}`;
    } else if (last?.kind === "p") {
      last.text = line;
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks.filter((b) => b.kind !== "p" || b.text);
}

/** `code` spans render like LeetCode's inline code. */
function inline(text: string): ReactNode {
  return text.split(/`([^`]+)`/).map((part, i) =>
    i % 2 ? (
      <code key={i} className="rounded border border-line-strong/60 bg-fill-2 px-1 py-px font-mono text-[13px] text-text-1">
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function MissionDescription({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-text-1">
      {toBlocks(text).map((block, i) => {
        if (block.kind === "p") return <p key={i}>{inline(block.text)}</p>;
        const List = block.kind;
        return (
          <List key={i} className={List === "ol" ? "list-decimal space-y-1 pl-6" : "list-disc space-y-1 pl-6"}>
            {block.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
