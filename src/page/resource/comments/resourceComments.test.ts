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

async function applyCommentStyles(fixture: HTMLElement, css: string) {
  const result = await postcss([
    tailwindcss({
      ...loadConfig(resolve('tailwind.config.js')),
      content: [{ raw: fixture.outerHTML, extension: 'html' }],
    }),
  ]).process(css, { from: undefined });
  const style = document.createElement('style');
  style.textContent = result.css;
  document.head.append(style);
  return style;
}

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

  it('leaves the larger reference whitespace around the document footer', async () => {
    const fixture = document.createElement('section');
    fixture.className = 'resource-document-comments';
    fixture.innerHTML = `<div class="resource-document-comments__boundary"></div>
      <div class="omnibox-comment-surface resource-document-comments__composer"></div>`;
    const style = await applyCommentStyles(
      fixture,
      readFileSync('src/page/resource/comments/resourceComments.css', 'utf8')
    );
    document.body.append(fixture);
    try {
      expect(getComputedStyle(fixture).marginTop).toBe('5rem');
      expect(getComputedStyle(fixture).paddingBottom).toBe('10rem');
      expect(
        getComputedStyle(
          fixture.querySelector('.resource-document-comments__boundary')!
        ).marginBottom
      ).toBe('2.5rem');
      expect(
        getComputedStyle(
          fixture.querySelector('.resource-document-comments__composer')!
        ).marginTop
      ).toBe('2rem');
    } finally {
      fixture.remove();
      style.remove();
    }
  });

  it('keeps the layout marker invisible before the heading or empty composer', async () => {
    const fixture = document.createElement('div');
    fixture.innerHTML = `<section class="resource-document-comments">
        <div class="resource-document-comments__boundary"></div>
      </section>
      <section class="resource-document-comments">
        <div class="resource-document-comments__boundary"></div>
        <h1 class="resource-document-comments__title">Full document comments</h1>
      </section>`;
    const style = await applyCommentStyles(
      fixture,
      readFileSync('src/page/resource/comments/resourceComments.css', 'utf8')
    );
    document.body.append(fixture);
    try {
      const [empty, populated] = fixture.querySelectorAll(
        '.resource-document-comments__boundary'
      );
      expect(getComputedStyle(empty).borderTopWidth).not.toBe('1px');
      expect(getComputedStyle(populated).borderTopWidth).not.toBe('1px');
    } finally {
      fixture.remove();
      style.remove();
    }
  });

  it('aligns the comment heading and hover controls with the reference list', async () => {
    const fixture = document.createElement('section');
    fixture.className = 'resource-document-comments';
    fixture.innerHTML = `<h1 class="resource-document-comments__title">Full document comments</h1>
      <article class="resource-document-comment">
        <div class="resource-document-comment__toolbar-row"><div class="omnibox-comment-thread__toolbar"></div></div>
      </article>`;
    const style = await applyCommentStyles(
      fixture,
      readFileSync('src/page/resource/comments/resourceComments.css', 'utf8')
    );
    document.body.append(fixture);
    try {
      expect(
        getComputedStyle(
          fixture.querySelector('.resource-document-comments__title')!
        ).borderBottomWidth
      ).toBe('1px');
      expect(
        getComputedStyle(fixture.querySelector('.resource-document-comment')!)
          .paddingLeft
      ).toBe('1rem');
      expect(
        getComputedStyle(fixture.querySelector('.resource-document-comment')!)
          .paddingTop
      ).toBe('0.75rem');
    } finally {
      fixture.remove();
      style.remove();
    }
  });

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
