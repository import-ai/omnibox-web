import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const jsdomRequire = createRequire(require.resolve('jest-environment-jsdom'));
const { JSDOM } = jsdomRequire('jsdom');
const { transpileModule, ModuleKind } = require('typescript');
const source = await readFile(
  new URL(
    '../src/page/resource/editor/normalizeResourceEditorContent.ts',
    import.meta.url
  ),
  'utf8'
);
const { outputText } = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext },
});
const { normalizeResourceEditorContent } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://example.com',
});
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'MutationObserver',
  'getComputedStyle',
  'innerHeight',
  'innerWidth',
  'scrollX',
  'scrollY',
  'DOMParser',
  'File',
  'FileReader',
  'DOMRect',
  'ShadowRoot',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
  });
}
globalThis.ResizeObserver = dom.window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.IntersectionObserver = dom.window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
dom.window.HTMLCanvasElement.prototype.getContext = () => null;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const editorUrl = new URL(
  './omnibox-editor.js',
  pathToFileURL(require.resolve('@import-ai/omnibox-editor'))
);
const { OmniboxEditor, contentToTiptapJson, findResourceCommentRange } =
  await import(editorUrl);
const results = [];

async function mount(markdown, editable, normalize) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const original = contentToTiptapJson(markdown);
  const before = JSON.stringify(original);
  const content = normalize
    ? normalizeResourceEditorContent(original)
    : original;
  let ready = false;
  let editor;
  let finish;
  const initialized = new Promise(resolve => {
    finish = resolve;
  });
  const timeout = setTimeout(
    () => finish('Editor initialization timed out'),
    3000
  );
  const onError = event => {
    event.preventDefault();
    finish(event.error?.message ?? event.message);
  };
  dom.window.addEventListener('error', onError);
  root.render(
    React.createElement(OmniboxEditor, {
      content,
      editable,
      variant: 'embedded',
      showHeader: false,
      showToc: false,
      onReady: instance => {
        editor = instance;
        ready = true;
        instance.state.doc.descendants((node, position) => {
          if (!node.isText) return;
          for (const [id, quote] of [
            ['first', 'First quote'],
            ['second', 'Second quote'],
          ]) {
            const offset = node.text.indexOf(quote);
            if (offset >= 0)
              instance.commands.addResourceComment({
                threadId: id,
                from: position + offset,
                to: position + offset + quote.length,
              });
          }
        });
        finish(null);
      },
    })
  );
  const error = await initialized;
  clearTimeout(timeout);
  const result = {
    editable,
    normalize,
    error,
    ready,
    inputUnchanged: JSON.stringify(original) === before,
    markers: [...host.querySelectorAll('[data-resource-comment-thread]')].map(
      node => ({
        id: node.getAttribute('data-resource-comment-thread'),
        text: node.textContent,
      })
    ),
    ranges: editor
      ? ['first', 'second'].map(id => findResourceCommentRange(editor, id))
      : [],
  };
  root.unmount();
  host.remove();
  dom.window.removeEventListener('error', onError);
  return result;
}

try {
  results.push(await mount('>\n\nFirst quote\n\nSecond quote', false, false));
  for (const editable of [false, true]) {
    for (const markdown of [
      '>\n\nFirst quote\n\n>\n\nSecond quote',
      '- Item\n  >\n\nFirst quote\n\nSecond quote',
      '> Valid quote\n\nFirst quote\n\nSecond quote',
    ])
      results.push(await mount(markdown, editable, true));
  }
  console.log(JSON.stringify(results));
} finally {
  dom.window.close();
}
