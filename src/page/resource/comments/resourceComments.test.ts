/** @jest-environment jsdom */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

function declarationsFor(
  styles: ReturnType<typeof postcss.parse>,
  selector: string
) {
  const declarations: Record<string, string> = {};
  styles.walkRules(rule => {
    if (rule.selectors.includes(selector)) {
      rule.nodes.forEach(node => {
        if (node.type === 'decl') declarations[node.prop] = node.value;
      });
    }
  });
  if (!Object.keys(declarations).length)
    throw new Error(`Missing compiled comment rule: ${selector}`);
  return declarations;
}

function applyCommentStyles(
  styles: ReturnType<typeof postcss.parse>,
  editorSelectors: string[] = []
) {
  const editorRules = editorSelectors.length
    ? postcss
        .parse(
          readFileSync(
            'node_modules/@import-ai/omnibox-editor/dist/omnibox-editor.css',
            'utf8'
          )
        )
        .nodes.filter(
          node =>
            node.type === 'rule' && editorSelectors.includes(node.selector)
        )
    : [];
  const style = document.createElement('style');
  // jsdom cannot parse CSS nesting; preserve the compiled top-level declarations.
  style.textContent = [...editorRules, ...styles.nodes]
    .filter(node => node.type === 'rule')
    .map(node => {
      const rule = node.clone();
      rule.nodes = rule.nodes?.filter(child => child.type === 'decl');
      return rule.toString();
    })
    .join('\n');
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
    const style = applyCommentStyles(compileComments(), [
      '.omnibox-comment-surface',
    ]);
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
    const styles = compileComments();
    const style = applyCommentStyles(styles);
    document.body.append(fixture);
    try {
      // jsdom does not resolve Tailwind 4's spacing variables in calc().
      expect(
        declarationsFor(styles, '.resource-document-comments')
      ).toMatchObject({
        'margin-top': 'calc(var(--spacing, 0.25rem) * 20)',
        'padding-bottom': 'calc(var(--spacing, 0.25rem) * 40)',
      });
      expect(
        declarationsFor(styles, '.resource-document-comments__boundary')
      ).toMatchObject({
        'margin-bottom': 'calc(var(--spacing, 0.25rem) * 10)',
      });
      expect(
        declarationsFor(
          styles,
          '.omnibox-comment-surface.resource-document-comments__composer'
        )
      ).toMatchObject({
        'margin-top': 'calc(var(--spacing, 0.25rem) * 8)',
      });
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
    const styles = compileComments();
    const style = applyCommentStyles(styles);
    document.body.append(fixture);
    try {
      const [empty, populated] = fixture.querySelectorAll(
        '.resource-document-comments__boundary'
      );
      expect(
        declarationsFor(styles, '.resource-document-comments__boundary')
      ).toEqual({
        'margin-bottom': 'calc(var(--spacing, 0.25rem) * 10)',
      });
      expect(getComputedStyle(empty).borderTopWidth).not.toBe('1px');
      expect(getComputedStyle(populated).borderTopWidth).not.toBe('1px');
    } finally {
      fixture.remove();
      style.remove();
    }
  });

  it('aligns the comment heading and hover controls with the reference list', async () => {
    const fixture = document.createElement('section');
    fixture.className = 'resource-document-comments resource-comments-panel';
    fixture.innerHTML = `<h1 class="resource-document-comments__title">Full document comments</h1>
      <article class="resource-document-comment">
        <div class="omnibox-comment-message__header">
          <div class="omnibox-comment-message__author"><strong>Author</strong><time>Now</time></div>
          <div class="omnibox-comment-message__meta">
            <button class="omnibox-comment-message__action" aria-label="Copy link"><svg></svg></button>
            <button class="omnibox-comment-message__action" aria-label="Resolve"><svg></svg></button>
            <button class="omnibox-comment-message__action" aria-label="Edit"><svg></svg></button>
            <button class="omnibox-comment-message__action omnibox-comment-message__action--delete" aria-label="Delete"><svg></svg></button>
          </div>
        </div>
      </article>`;
    const styles = compileComments();
    const style = applyCommentStyles(styles, [
      '.omnibox-comment-message__header',
      '.omnibox-comment-message__author',
      '.omnibox-comment-message__meta',
      '.omnibox-comment-message__action',
      '.omnibox-comment-message__action svg',
    ]);
    document.body.append(fixture);
    try {
      expect(
        getComputedStyle(
          fixture.querySelector('.resource-document-comments__title')!
        ).borderBottomWidth
      ).toBe('1px');
      expect(
        declarationsFor(styles, '.resource-document-comment')
      ).toMatchObject({
        'padding-inline': 'calc(var(--spacing, 0.25rem) * 4)',
        'padding-block': 'calc(var(--spacing, 0.25rem) * 3)',
      });
      const header = fixture.querySelector('.omnibox-comment-message__header')!;
      const meta = fixture.querySelector('.omnibox-comment-message__meta')!;
      expect(getComputedStyle(header).display).toBe('flex');
      expect(getComputedStyle(header).justifyContent).toBe('space-between');
      expect(getComputedStyle(meta).display).toBe('flex');
      expect(getComputedStyle(meta).flexShrink).toBe('0');
      for (const action of meta.querySelectorAll('button')) {
        const button = getComputedStyle(action);
        expect(button.width).toBe('1.5rem');
        expect(button.height).toBe('1.5rem');
        const icon = getComputedStyle(action.querySelector('svg')!);
        expect(icon.width).toMatch(/^0?\.875rem$/);
        expect(icon.height).toMatch(/^0?\.875rem$/);
      }
      expect(
        declarationsFor(
          styles,
          '.resource-document-comment:hover .omnibox-comment-message__meta'
        )
      ).toMatchObject({ opacity: '100%' });
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
