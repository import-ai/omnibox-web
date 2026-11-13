import { copyBodyMarkdown } from './copyBodyMarkdown';

// Load the real ESM parser through Node, outside Jest's CommonJS loader.
jest.mock('mdast-util-from-markdown', () => {
  const { createRequire } = process.getBuiltinModule('node:module');
  return createRequire(__filename)('mdast-util-from-markdown');
});

describe('copyBodyMarkdown', () => {
  it.each([
    ['rgb(23, 23, 23)', '修复了一些已知问题'],
    ['rgb(0, 0, 0)', '该域名仅用于文档示例，无需获得许可。'],
    ['var(--tt-color-text-red)', 'colored'],
  ])('removes saved color wrappers for %s', (color, body) => {
    expect(
      copyBodyMarkdown(`[text-color color="${color}"]${body}[/text-color]`)
    ).toBe(body);
  });

  it('preserves the changelog structure and text around styled spans', () => {
    const input = [
      '大家好，我们发布了 v0.1.56 测试版。',
      '',
      '> [发布记录](https://github.com/import-ai/omnibox/releases/tag/v0.1.56)',
      '',
      '**网页端**',
      '',
      '6. [text-color color="rgb(23, 23, 23)"]修复了一些已知问题[/text-color]',
      '',
      '**微信 [text-color color="rgb(23, 23, 23)"]AI 对话[/text-color]助手**',
      '',
      '1. 支持在「[text-color color="rgb(23, 23, 23)"]微信 AI 对话助手」中通过语音问答[/text-color]',
      '2. 「[text-color color="rgb(23, 23, 23)"]微信 AI 对话助手」[/text-color]回复时展示「对方正在输入中」状态',
      '',
      '**2026.11.5**',
      '',
    ].join('\n');
    const expected = [
      '大家好，我们发布了 v0.1.56 测试版。',
      '',
      '> [发布记录](https://github.com/import-ai/omnibox/releases/tag/v0.1.56)',
      '',
      '**网页端**',
      '',
      '6. 修复了一些已知问题',
      '',
      '**微信 AI 对话助手**',
      '',
      '1. 支持在「微信 AI 对话助手」中通过语音问答',
      '2. 「微信 AI 对话助手」回复时展示「对方正在输入中」状态',
      '',
      '**2026.11.5**',
      '',
    ].join('\n');

    expect(copyBodyMarkdown(input)).toBe(expected);
  });

  it.each([
    [
      '[text-color color="red"]**bold** [link](./doc)[/text-color]',
      '**bold** [link](./doc)',
    ],
    [
      '[link [text-color color="red"]label[/text-color]](./doc)',
      '[link label](./doc)',
    ],
    [
      '[text-color color="red"]a[/text-color][text-color color="blue"]b[/text-color]',
      'ab',
    ],
    [
      '[text-color color="red"]a[text-color color="blue"]b[/text-color]c[/text-color]',
      'abc',
    ],
    ['[text-color]body[/text-color]', 'body'],
    ["[text-color color='red']body[/text-color]", 'body'],
    ['[text-color color=red]body[/text-color]', 'body'],
    [
      '[text-color color="red"]line\r\nnext[/text-color]\r\n',
      'line\r\nnext\r\n',
    ],
    ['[text-color color="red"]colored `code`[/text-color]', 'colored `code`'],
    ['\\\\[text-color color="red"]body[/text-color]', '\\\\body'],
  ])('only removes wrapper ranges from %s', (input, expected) => {
    expect(copyBodyMarkdown(input)).toBe(expected);
  });

  it.each([
    '`[text-color color="red"]code[/text-color]`',
    '``[text-color color="red"]`code`[/text-color]``',
    '```md\n[text-color color="red"]code[/text-color]\n```',
    '~~~md\n[text-color color="red"]code[/text-color]\n~~~',
    '    [text-color color="red"]code[/text-color]\n',
    '\\[text-color color="red"]literal\\[/text-color]',
    '&#91;text-color color="red"]literal&#91;/text-color]',
    '[text-color color="red"]unclosed',
    '[text-color color="red]malformed[/text-color]',
    '[text-color color="red" extra="value"]unrecognized[/text-color]',
    'unopened[/text-color]',
    '[text-color color="red"]different\n\nparagraph[/text-color]',
    '[text-color color="red"]literal\\[/text-color]',
    '<div>\n[text-color color="red"]HTML[/text-color]\n</div>',
    '<code>[text-color color="red"]HTML code[/text-color]</code>',
    '<span title="[text-color color=red]attribute[/text-color]">HTML</span>',
    '[link](</[text-color]/[/text-color]>)',
    '[link](/doc "[text-color color=red]title[/text-color]")',
    '![alt [text-color color="red"]literal[/text-color]](image.png)',
    '[link][id]\n\n[id]: /doc "[text-color color=red]title[/text-color]"',
    '[text-color color="red"]x[/text-color]\n\n[text-color color="red"]: /url',
    '[highlight color="red"]highlight[/highlight]',
    '# Title\r\n\r\n- **Item**  \r\n\r\n[Video](https://youtu.be/abcdefghijk)\r\n',
    '',
  ])('preserves literal or unrelated source: %s', input => {
    expect(copyBodyMarkdown(input)).toBe(input);
  });

  it('cleans table cells without rewriting tables or adjacent HTML and code', () => {
    const input =
      '| A | B |\n| --- | --- |\n| [text-color color="red"]text[/text-color] | `[/text-color]` |\n\n<div>raw HTML</div>';
    const expected =
      '| A | B |\n| --- | --- |\n| text | `[/text-color]` |\n\n<div>raw HTML</div>';
    expect(copyBodyMarkdown(input)).toBe(expected);
  });

  it('preserves literal markers beside actual styled text in one body', () => {
    const literal =
      '```md\n[text-color color="red"]example[/text-color]\n```\n\n';
    const input = literal + '**[text-color color="red"]body[/text-color]**';
    expect(copyBodyMarkdown(input)).toBe(literal + '**body**');
  });
});
