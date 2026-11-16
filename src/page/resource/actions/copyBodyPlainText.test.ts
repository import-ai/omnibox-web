/** @jest-environment jsdom */

import { copyBodyPlainText } from './copyBodyPlainText';

// Exercise the real ESM parser while bypassing Jest's CommonJS loader.
jest.mock('mdast-util-from-markdown', () =>
  process.getBuiltinModule('node:module').createRequire(__filename)(
    'mdast-util-from-markdown'
  )
);
jest.mock('mdast-util-gfm', () =>
  process.getBuiltinModule('node:module').createRequire(__filename)(
    'mdast-util-gfm'
  )
);
jest.mock('micromark-extension-gfm', () =>
  process.getBuiltinModule('node:module').createRequire(__filename)(
    'micromark-extension-gfm'
  )
);

describe('copyBodyPlainText', () => {
  it.each([
    ['**加粗** *斜体* ~~删除线~~', '加粗 斜体 删除线'],
    ['<u>下划线</u>', '下划线'],
    ['==高亮==', '高亮'],
    ['[highlight color="yellow"]高亮[/highlight]', '高亮'],
    ['[text-color color="rgb(23, 23, 23)"]颜色[/text-color]', '颜色'],
    ['**[text-color color="red"]*==叠加==*[/text-color]**', '叠加'],
    ['[highlight]a[text-color color="blue"]b[/text-color]c[/highlight]', 'abc'],
    [
      '# 标题\n\n## 子标题\n\n第一段\n换行\n\n第二段',
      '标题\n\n子标题\n\n第一段\n换行\n\n第二段',
    ],
    ['第一行  \n第二行', '第一行\n第二行'],
    ['> **引用**\n>\n> 下一段', '引用\n\n下一段'],
    ['6. **第六项**\n7. 第七项', '6. 第六项\n7. 第七项'],
    ['- 第一项\n  - ==子项==\n- 第二项', '- 第一项\n  - 子项\n- 第二项'],
    ['1. 第一项\n   - 子项\n2. 第二项', '1. 第一项\n   - 子项\n2. 第二项'],
    ['- [x] 完成\n- [ ] 待办', '- [x] 完成\n- [ ] 待办'],
    [
      '[小黑官网](https://www.omnibox.pro/)',
      '小黑官网（https://www.omnibox.pro/）',
    ],
    [
      '[https://www.omnibox.pro/](https://www.omnibox.pro/)',
      'https://www.omnibox.pro/',
    ],
    ['https://www.omnibox.pro/', 'https://www.omnibox.pro/'],
    ['[**链接**与*样式*](./doc)', '链接与样式（./doc）'],
    ['[链接][ID]\n\n[ID]: https://example.com', '链接（https://example.com）'],
    ['`user_name`', 'user_name'],
    [
      '`**不是加粗** ==不是高亮== [text-color]原文[/text-color]`',
      '**不是加粗** ==不是高亮== [text-color]原文[/text-color]',
    ],
    [
      '```md\n**不是加粗**\n  [text-color color="red"]原文[/text-color]\n```',
      '**不是加粗**\n  [text-color color="red"]原文[/text-color]',
    ],
    ['    **缩进代码**\n    ==不是高亮==', '**缩进代码**\n==不是高亮=='],
    [
      '星号 *、下划线 _、正斜线 /、反斜线 \\、等号 ==',
      '星号 *、下划线 _、正斜线 /、反斜线 \\、等号 ==',
    ],
    [
      '/api/v1/resources、user_name、a * b、a == b',
      '/api/v1/resources、user_name、a * b、a == b',
    ],
    [
      '\\[text-color color="red"]原文\\[/text-color]',
      '[text-color color="red"]原文[/text-color]',
    ],
    [
      '&#91;text-color color="red"]原文&#91;/text-color]',
      '[text-color color="red"]原文[/text-color]',
    ],
    ['\\==原文\\==', '==原文=='],
    ['[text-color color="red"]未闭合', '[text-color color="red"]未闭合'],
    [
      '[text-color color="red" extra="value"]非样式[/text-color]',
      '[text-color color="red" extra="value"]非样式[/text-color]',
    ],
    [
      '| A | B |\n| --- | --- |\n| **值** | [highlight]亮[/highlight] |',
      'A\tB\n值\t亮',
    ],
    [
      '<table><tr><th>A</th><th>B</th></tr><tr><td>值</td><td>亮</td></tr></table>',
      'A\tB\n值\t亮',
    ],
    ['<div><b>粗体</b><br/>下一行</div>', '粗体\n下一行'],
    [
      '<p><span style="color:red">颜色</span>与<u>下划线</u></p>',
      '颜色与下划线',
    ],
    [
      '<a href="https://example.com"><b>链接</b></a>',
      '链接（https://example.com）',
    ],
    [
      '<code>**字面量** [text-color]原文[/text-color]</code>',
      '**字面量** [text-color]原文[/text-color]',
    ],
    ['&lt;u&gt;原文&lt;/u&gt;', '<u>原文</u>'],
    [
      '前<code>**字面量** [text-color]原文[/text-color]</code>后',
      '前**字面量** [text-color]原文[/text-color]后',
    ],
    [
      '前<a href="https://example.com">**链接**</a>后',
      '前链接（https://example.com）后',
    ],
    [
      '<ul><li>一<b>加粗</b><ul><li>子项</li></ul></li><li>二</li></ul>',
      '- 一加粗\n  - 子项\n- 二',
    ],
    [
      '<table><tr><td><p>第一段</p><p>第二段</p></td><td>另一格</td></tr></table>',
      '第一段\n第二段\t另一格',
    ],
    [
      '![图片描述](https://example.com/a.png)',
      '图片描述（https://example.com/a.png）',
    ],
    ['正文\n\n---\n\n结束', '正文\n\n结束'],
    [
      ':::block-style {textAlign="center" indent="2"}\n\n**正文**\n\n:::',
      '正文',
    ],
    [':::block-style\n正文\n:::', '正文'],
    [
      ':::block-style {backgroundColor="yellow"}\n\n第一段\n\n:::block-style {textAlign="right"}\n\n第二段\n\n:::\n\n:::',
      '第一段\n\n第二段',
    ],
    [':::block-style {indent="2"}\n\n- 一\n- 二\n\n:::', '- 一\n- 二'],
    [
      '> :::block-style {textAlign="center" indent="2"}\n>\n> hello\n>\n> :::',
      'hello',
    ],
    ['> :::block-style\n> **正文**\n> :::', '正文'],
    [
      '> > :::block-style {textAlign="right"}\n> >\n> > 内层\n> >\n> > :::',
      '内层',
    ],
    ['- :::block-style {textAlign="center"}\n\n  正文\n\n  :::', '- 正文'],
    ['> - :::block-style\n>\n>   正文\n>\n>   :::', '- 正文'],
    [
      '> :::block-style\n>\n> ```md\n> :::\n> ^代码^\n> ```\n>\n> 正文\n>\n> :::',
      ':::\n^代码^\n\n正文',
    ],
    ['> :::block-style\n> 未闭合\n\n:::', ':::block-style\n未闭合\n\n:::'],
    ['前文 :::block-style\n正文\n:::', '前文 :::block-style\n正文\n:::'],
    ['> \\:::block-style\n> 正文\n> \\:::', ':::block-style\n正文\n:::'],
    ['E = mc^2^ and ^**重点**^', 'E = mc2 and 重点'],
    ['H~2~O 与 ~~删除线~~', 'H2O 与 删除线'],
    ['^[@ id="u1" label="Alice"]^', '@Alice'],
    ['[@ id="u1" label="==Alice== &copy;"]', '@==Alice== &copy;'],
    ['`H~2~O` 和 \\~保留\\~', 'H~2~O 和 ~保留~'],
    ['hey [@ id="u1" label="Alice"] please review', 'hey @Alice please review'],
    ["[@ label='张三' id='u1']", '@张三'],
    ['[@ id="u1"]', '@u1'],
    ['[@ id="u1" label="**Alice**"]', '@**Alice**'],
    [
      '\\^保留\\^ 和 \\[@ id="u1" label="Alice"]',
      '^保留^ 和 [@ id="u1" label="Alice"]',
    ],
    [
      '&#94;保留&#94; 和 &#91;@ id="u1" label="Alice"]',
      '^保留^ 和 [@ id="u1" label="Alice"]',
    ],
    ['`^上标^ [@ id="u1" label="Alice"]`', '^上标^ [@ id="u1" label="Alice"]'],
    [
      '```md\n:::block-style {indent="2"}\n^上标^ [@ id="u1" label="Alice"]\n:::\n```',
      ':::block-style {indent="2"}\n^上标^ [@ id="u1" label="Alice"]\n:::',
    ],
    [
      ':::block-style {indent="2"}\n\n未闭合',
      ':::block-style {indent="2"}\n\n未闭合',
    ],
    [
      '[链接](https://example.com/^path^)',
      '链接（https://example.com/^path^）',
    ],
    [
      '<table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td colspan="2">AB</td><td>C值</td></tr></table>',
      'A\tB\tC\nAB\t\tC值',
    ],
    [
      '<table><tr><th>A</th><th>B</th></tr><tr><td rowspan="2">A值</td><td>B1</td></tr><tr><td>B2</td></tr></table>',
      'A\tB\nA值\tB1\n\tB2',
    ],
    [
      '<table><tr><td rowspan="2" colspan="2">AB</td><td>C1</td></tr><tr><td>C2</td></tr></table>',
      'AB\t\tC1\n\t\tC2',
    ],
    [
      '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>A1</td><td rowspan="2">B值</td></tr><tr><td>A2</td></tr></tbody></table>',
      'A\tB\nA1\tB值\nA2\t',
    ],
    ['正文<script>window.bad = 1</script>结尾', '正文结尾'],
    [
      '<code>^上标^ [@ id="u1" label="Alice"]</code>',
      '^上标^ [@ id="u1" label="Alice"]',
    ],
    [
      '前<code>^上标^ [@ id="u1" label="Alice"]</code>后',
      '前^上标^ [@ id="u1" label="Alice"]后',
    ],
    ['https://example.com/^path^', 'https://example.com/^path^'],
    [
      ':::block-style {indent="2"}\n\n```md\n:::\n^代码^\n```\n\n正文\n\n:::',
      ':::\n^代码^\n\n正文',
    ],
    [
      '<table><tbody><tr><td rowspan="0">A</td><td>B1</td></tr><tr><td>B2</td></tr></tbody><tbody><tr><td>A3</td><td>B3</td></tr></tbody></table>',
      'A\tB1\n\tB2\nA3\tB3',
    ],
    [
      '<table><tr><td colspan="bogus">A</td><td rowspan="-1">B</td></tr><tr><td>C</td><td>D</td></tr></table>',
      'A\tB\nC\tD',
    ],
    ['正文<template>一<template>二</template>三</template>结尾', '正文结尾'],
    ['正文<script>未闭合', '正文'],
    ['&lt;script&gt;原样&lt;/script&gt;', '<script>原样</script>'],
    ['正文<style>b{color:red}</style>结尾', '正文结尾'],
    ['正文<template><b>隐藏</b></template>结尾', '正文结尾'],
    ['正文<noscript>隐藏</noscript>结尾', '正文结尾'],
    ['正文<script>\nwindow.bad = 1\n</script>结尾', '正文结尾'],
    [
      '`<script>原样</script>` 与 `<style>原样</style>`',
      '<script>原样</script> 与 <style>原样</style>',
    ],
    ['[text-color color="red"][/text-color]', ''],
    ['', ''],
  ])('serializes %s', (source, expected) => {
    expect(copyBodyPlainText(source)).toBe(expected);
  });

  it('does not execute or include scripts and styles from HTML', () => {
    expect(
      copyBodyPlainText(
        '<div>正文<script>window.bad = 1</script><style>b{color:red}</style></div>'
      )
    ).toBe('正文');
    expect((window as unknown as Record<string, unknown>).bad).toBeUndefined();
  });
});
