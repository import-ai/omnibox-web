const HELD_CODE = /\0CODE(\d+)\0/g;
const MENTION_SHORTCODE = /\[@\s+([^\]]*)\]/g;
const ATTR = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;

function holdCodeBlocks(markdown: string): {
  text: string;
  slots: string[];
} {
  const slots: string[] = [];
  const hold = (block: string) => {
    slots.push(block);
    return `\0CODE${slots.length - 1}\0`;
  };

  const withoutFences = markdown.replace(
    /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm,
    hold
  );
  const text = withoutFences.replace(/(`+)[\s\S]*?\1/g, hold);

  return { text, slots };
}

function restoreCodeBlocks(text: string, slots: string[]) {
  return text.replace(HELD_CODE, (_match, index) => slots[Number(index)] ?? '');
}

function attrValue(attributes: string, name: string): string | undefined {
  ATTR.lastIndex = 0;
  let match = ATTR.exec(attributes);
  while (match) {
    if (match[1] === name) {
      return match[2] ?? match[3];
    }
    match = ATTR.exec(attributes);
  }
  return undefined;
}

function quoted(value: string) {
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  return null;
}

function withLabel(shortcode: string, attributes: string, label: string) {
  const id = attrValue(attributes, 'id');
  const labelQuote = quoted(label);
  const idQuote = id ? quoted(id) : null;
  if (!labelQuote) {
    return shortcode;
  }
  if (id && idQuote) {
    return `[@ id=${idQuote} label=${labelQuote}]`;
  }

  const trimmed = attributes.trim();
  return trimmed
    ? `[@ ${trimmed} label=${labelQuote}]`
    : `[@ label=${labelQuote}]`;
}

export function resolveMentionLabels(
  markdown: string,
  namesById: Record<string, string>
): string {
  if (!markdown || Object.keys(namesById).length === 0) {
    return markdown;
  }

  const { text, slots } = holdCodeBlocks(markdown);
  const rewritten = text.replace(
    MENTION_SHORTCODE,
    (shortcode, attributes: string) => {
      const id = attrValue(attributes, 'id');
      const latest = id ? namesById[id] : undefined;
      if (!latest || attrValue(attributes, 'label') === latest) {
        return shortcode;
      }
      return withLabel(shortcode, attributes, latest);
    }
  );

  return restoreCodeBlocks(rewritten, slots);
}
