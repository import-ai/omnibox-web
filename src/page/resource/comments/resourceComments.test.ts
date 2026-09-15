/** @jest-environment jsdom */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const postcss = jest.requireActual<typeof import('postcss').default>('postcss');
const tailwindcss =
  jest.requireActual<typeof import('tailwindcss')>('tailwindcss');
const loadConfig = jest.requireActual<typeof import('tailwindcss/loadConfig')>(
  'tailwindcss/loadConfig'
);

describe('compiled resource comment styles', () => {
  it('keeps the shared panel out of the document flow', async () => {
    const panel = document.createElement('div');
    panel.className = 'resource-comments-panel absolute';
    const config = loadConfig(resolve('tailwind.config.js'));
    const css = readFileSync(
      'src/page/resource/comments/resourceComments.css',
      'utf8'
    );
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: panel.outerHTML, extension: 'html' }],
      }),
    ]).process(`@tailwind utilities;\n${css}`, { from: undefined });
    const positions: string[] = [];
    result.root.walkRules(rule => {
      if (panel.matches(rule.selector)) {
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
    const config = loadConfig(resolve('tailwind.config.js'));
    const css = readFileSync(
      'src/page/resource/comments/resourceComments.css',
      'utf8'
    );
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: fixture.outerHTML, extension: 'html' }],
      }),
    ]).process(css, { from: undefined });
    const style = document.createElement('style');
    style.textContent = result.css;
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
