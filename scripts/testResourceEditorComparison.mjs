import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const require = createRequire(`${process.cwd()}/package.json`);
const jsdomRequire = createRequire(require.resolve('jest-environment-jsdom'));
const { JSDOM } = jsdomRequire('jsdom');
const { transpileModule, ModuleKind } = require('typescript');
const source = await readFile(
  new URL('../src/page/resource/editor/contentComparison.ts', import.meta.url),
  'utf8'
);
const { outputText } = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext },
});
const { isDocumentChanged, toComparableDocument } = await import(
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

const React = await import(pathToFileURL(require.resolve('react')));
const { createRoot } = await import(
  pathToFileURL(require.resolve('react-dom/client'))
);
const editorUrl = new URL(
  './omnibox-editor.js',
  pathToFileURL(require.resolve('@import-ai/omnibox-editor'))
);
const { OmniboxEditor, contentToTiptapJson } = await import(editorUrl);

const serverMarkdown = [
  '# 标题',
  '',
  'See [@ id="user-1" label="Old name"] later',
  '',
  '[小红书](https://www.xiaohongshu.com/explore/abc?xsec_token=token&xsec_source=pc_search)',
  '',
  '[访谈录音](https://example.com/attachments/interview.m4a)',
  '',
  '[WAV 录音](https://example.com/attachments/interview.wav)',
  '',
  '[MP3 录音](https://example.com/attachments/interview.mp3)',
  '',
  '[说明文档](https://example.com/attachments/notes.md)',
  '',
  '[相对路径录音](attachments/relative.wav)',
  '',
  '```ts',
  'const a = 1;',
  '```',
].join('\n');

const linkBase = '/namespace-id/resource-id';

async function mount(markdown, withComment = false) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let editor;
  let finish;
  const ready = new Promise(resolve => {
    finish = resolve;
  });
  const timeout = setTimeout(() => finish(), 3000);
  root.render(
    React.createElement(OmniboxEditor, {
      content: contentToTiptapJson(markdown, { linkBase }),
      editable: true,
      variant: 'embedded',
      linkBase,
      showHeader: false,
      showToc: false,
      onReady: instance => {
        editor = instance;
        if (withComment) {
          instance.commands.addResourceComment({
            threadId: 'thread-1',
            from: 1,
            to: 2,
          });
        }
        finish();
      },
    })
  );
  await ready;
  clearTimeout(timeout);
  return {
    editor,
    json: editor.getJSON(),
    close: () => {
      root.unmount();
      host.remove();
    },
  };
}

const results = {};
try {
  const first = await mount(serverMarkdown);
  const firstBaseline = toComparableDocument(first.json);
  first.close();

  const draftWithoutComments = await mount(serverMarkdown);
  results.draftRemountUnchanged = !isDocumentChanged(
    toComparableDocument(contentToTiptapJson(serverMarkdown, { linkBase })),
    draftWithoutComments.json
  );
  draftWithoutComments.close();

  const second = await mount(serverMarkdown);
  results.remountUnchanged = !isDocumentChanged(firstBaseline, second.json);
  second.close();

  const draftBaseline = toComparableDocument(
    contentToTiptapJson(serverMarkdown, { linkBase })
  );
  const withLiveLabels = await mount(
    serverMarkdown.replace('label="Old name"', 'label="New name"'),
    true
  );
  results.draftAndCommentsUnchanged = !isDocumentChanged(
    draftBaseline,
    withLiveLabels.json
  );
  withLiveLabels.close();

  const changed = await mount(
    serverMarkdown.replace('xsec_token=token', 'xsec_token=changed')
  );
  results.linkQueryChanged = isDocumentChanged(firstBaseline, changed.json);
  changed.close();

  const codeChanged = await mount(
    serverMarkdown.replace('const a = 1;', 'const a = 1; ')
  );
  results.codeWhitespaceChanged = isDocumentChanged(
    firstBaseline,
    codeChanged.json
  );
  codeChanged.close();

  const attachmentChanged = await mount(
    serverMarkdown.replace('interview.m4a', 'interview.wav')
  );
  results.attachmentTargetChanged = isDocumentChanged(
    firstBaseline,
    attachmentChanged.json
  );
  attachmentChanged.close();

  console.log(JSON.stringify(results));
} finally {
  dom.window.close();
}
