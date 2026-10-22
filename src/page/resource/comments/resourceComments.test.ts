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
  it('keeps the full-width document composer in scrollable document flow', async () => {
    const fixture = document.createElement('section');
    fixture.className = 'resource-document-comments resource-comments-panel';
    fixture.innerHTML = `<div class="omnibox-comment-surface resource-document-comments__composer">
      <form class="omnibox-comment-composer" data-has-draft>
        <div class="omnibox-comment-composer__input" data-has-preview>
          <textarea></textarea>
          <div class="omnibox-comment-composer__preview"><img alt="" /></div>
        </div>
        <div class="omnibox-comment-composer__actions"><button>Cancel</button><button type="submit">Publish</button></div>
      </form>
    </div>`;
    const editorCss = postcss.parse(
      readFileSync(
        'node_modules/@import-ai/omnibox-editor/dist/omnibox-editor.css',
        'utf8'
      )
    );
    const surfaceRule = editorCss.nodes.find(
      node =>
        node.type === 'rule' && node.selector === '.omnibox-comment-surface'
    );
    if (!surfaceRule) throw new Error('Missing editor comment surface styles');
    const result = await postcss([
      tailwindcss({
        ...loadConfig(resolve('tailwind.config.js')),
        content: [{ raw: fixture.outerHTML, extension: 'html' }],
      }),
    ]).process(
      `${surfaceRule.toString()}\n${readFileSync('src/page/resource/comments/resourceComments.css', 'utf8')}`,
      { from: undefined }
    );
    const style = document.createElement('style');
    style.textContent = result.css;
    document.head.append(style);
    document.body.append(fixture);
    try {
      const composer = fixture.querySelector(
        '.resource-document-comments__composer'
      )!;
      const css = getComputedStyle(composer);
      expect(css.position).toBe('static');
      expect(css.width).toBe('100%');
      expect(css.maxHeight).toBe('none');
      expect(css.overflow).toBe('visible');
      expect(css.zIndex).toBe('auto');
      expect(getComputedStyle(fixture).flexShrink).toBe('0');
      expect(
        getComputedStyle(
          fixture.querySelector('.omnibox-comment-composer__actions')!
        ).pointerEvents
      ).toBe('auto');
    } finally {
      fixture.remove();
      style.remove();
    }
  });
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

      const editor = fixture.querySelector('.tiptap.ProseMirror');
      const imageThread = document.createElement('div');
      imageThread.className = 'node-image tiptap-thread';
      imageThread.setAttribute('data-resource-comment-thread', 'image-thread');
      imageThread.innerHTML = `<div class="tiptap-image" data-resource-comment-thread="image-thread"><div class="tiptap-image-container"><div class="tiptap-image-content"><img class="tiptap-image-img" alt="" /></div></div></div>`;
      editor?.append(imageThread);
      const imageContent = imageThread.querySelector('.tiptap-image-content');
      if (!imageContent) {
        throw new Error('Missing commented image');
      }
      const underline = style.textContent ?? '';
      expect(getComputedStyle(imageThread).borderBottomWidth).toBe('0px');
      expect(getComputedStyle(imageThread).paddingBottom).toBe('0px');
      expect(imageContent).toBeTruthy();
      expect(underline).toContain('.tiptap-image-content::before');
      expect(underline).toContain('top: calc(100% + 1px)');
      expect(underline).toContain('height: 2px');
      expect(underline).toContain('#faedc2');
    } finally {
      fixture.remove();
      style.remove();
    }
  });
});
