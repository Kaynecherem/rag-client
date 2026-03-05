"use client";

import React from "react";

/**
 * Lightweight markdown renderer for LLM responses.
 * Handles: **bold**, *italic*, - lists, numbered lists, headers, [Page X] citations.
 * No external dependencies — pure React parsing.
 */

interface MarkdownResponseProps {
  content: string;
  className?: string;
}

export default function MarkdownResponse({ content, className = "" }: MarkdownResponseProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`text-sm text-gray-800 leading-relaxed space-y-2 ${className}`}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

// ── Block types ────────────────────────────────────────────────────────

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading: ### Header
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Unordered list: - item or * item
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list: 1. item
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    let paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join("\n") });
    }
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case "heading":
      const Tag = block.level <= 2 ? "h3" : "h4";
      const hClass = block.level <= 2
        ? "font-semibold text-gray-900 text-sm"
        : "font-medium text-gray-800 text-sm";
      return <Tag key={key} className={hClass}>{renderInline(block.text)}</Tag>;

    case "list":
      const ListTag = block.ordered ? "ol" : "ul";
      const listClass = block.ordered
        ? "list-decimal list-outside ml-5 space-y-1"
        : "list-disc list-outside ml-5 space-y-1";
      return (
        <ListTag key={key} className={listClass}>
          {block.items.map((item, j) => (
            <li key={j} className="text-gray-800 text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ListTag>
      );

    case "paragraph":
      return <p key={key} className="text-gray-800 break-words">{renderInline(block.text)}</p>;

    default:
      return null;
  }
}

// ── Inline formatting ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, and `code` patterns
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find the earliest match
    let earliest: { match: RegExpMatchArray; type: "bold" | "italic" | "code" } | null = null;

    for (const [m, t] of [
      [boldMatch, "bold"],
      [italicMatch, "italic"],
      [codeMatch, "code"],
    ] as [RegExpMatchArray | null, "bold" | "italic" | "code"][]) {
      if (m && m.index !== undefined) {
        if (!earliest || m.index < earliest.match.index!) {
          earliest = { match: m, type: t };
        }
      }
    }

    if (!earliest) {
      // No more matches — push remaining text
      parts.push(remaining);
      break;
    }

    const { match, type } = earliest;
    const idx = match.index!;

    // Text before the match
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    // The formatted part
    const inner = match[1];
    switch (type) {
      case "bold":
        parts.push(<strong key={keyIdx++} className="font-semibold text-gray-900">{inner}</strong>);
        break;
      case "italic":
        parts.push(<em key={keyIdx++} className="italic">{inner}</em>);
        break;
      case "code":
        parts.push(
          <code key={keyIdx++} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
            {inner}
          </code>
        );
        break;
    }

    remaining = remaining.slice(idx + match[0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}