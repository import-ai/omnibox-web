/** @jest-environment jsdom */

import { execFileSync } from 'node:child_process';

const postcss = jest.requireActual<typeof import('postcss').default>('postcss');
function compileComments(candidates: string[] = []) {
  // Compile in Node because jsdom lacks the modern APIs used by Tailwind 4.
  const css = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';
    import { compile } from '@tailwindcss/node';
    const file = resolve('src/page/resource/comments/resourceComments.css');
    const compiler = await compile(readFileSync(file, 'utf8') + '\\n@tailwind utilities;', {
      base: resolve('src/page/resource/comments'), onDependency() {},
    });
    process.stdout.write(compiler.build(${JSON.stringify(candidates)}));
  `,
    ],
    { encoding: 'utf8' }
  );
  return postcss.parse(css);
}

describe('compiled resource comment styles', () => {
  it('keeps the shared panel out of the document flow', async () => {
    const panel = document.createElement('div');
    panel.className = 'resource-comments-panel absolute';
    const result = await compileComments(['absolute']);
    const positions: string[] = [];
    result.walkRules(rule => {
      if (
        rule.selector === '.absolute' ||
        rule.selector === '.resource-comments-panel'
      ) {
        rule.walkDecls('position', declaration => {
          positions.push(declaration.value);
        });
      }
    });

    expect(positions).toContain('absolute');
    expect(positions).not.toContain('relative');
  });
  it('keeps draft images in the input flow inside the sidebar', async () => {
    const fixture = document.createElement('div');
    fixture.className = 'resource-comments-panel dark';
    fixture.innerHTML = `<aside class="omnibox-comment-surface resource-comments-draft-surface" data-closing>
      <form class="omnibox-comment-composer">
        <q>Selected text</q>
        <div class="omnibox-comment-composer__input" data-has-preview>
          <textarea></textarea>
          <div class="omnibox-comment-composer__preview"><img alt="" /></div>
        </div>
        <div class="omnibox-comment-composer__actions"><button>Submit</button></div>
      </form>
    </aside>
    <div class="tiptap ProseMirror">
      <span class="resource-comment-draft-highlight">Selected text</span>
    </div>`;
    const result = await compileComments();
    const style = document.createElement('style');
    // jsdom does not implement CSS nesting; these layout rules are top-level.
    style.textContent = result.nodes
      .filter(node => node.type === 'rule')
      .map(node => {
        const rule = node.clone();
        rule.nodes = rule.nodes?.filter(child => child.type === 'decl');
        return rule.toString();
      })
      .join('\n');
    document.head.append(style);
    document.body.append(fixture);
    try {
      const input = fixture.querySelector('.omnibox-comment-composer__input');
      const preview = fixture.querySelector(
        '.omnibox-comment-composer__preview'
      );
      const actions = fixture.querySelector(
        '.omnibox-comment-composer__actions'
      );
      const draftHighlight = fixture.querySelector(
        '.resource-comment-draft-highlight'
      );
      if (!input || !preview || !actions || !draftHighlight) {
        throw new Error('Missing comment draft elements');
      }
      expect(getComputedStyle(input).display).toBe('block');
      expect(getComputedStyle(preview).position).toBe('relative');
      expect(getComputedStyle(preview).bottom).toBe('');
      expect(getComputedStyle(actions).display).toBe('flex');
      expect(getComputedStyle(draftHighlight).borderBottomWidth).toBe('2px');
      expect(getComputedStyle(draftHighlight).borderBottomStyle).toBe('solid');
    } finally {
      fixture.remove();
      style.remove();
    }
  });
});
