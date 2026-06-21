import Vditor from 'vditor';

import { VDITOR_CDN } from '@/const';

type DiagramLanguage =
  | 'abc'
  | 'echarts'
  | 'flowchart'
  | 'graphviz'
  | 'markmap'
  | 'mermaid'
  | 'mindmap'
  | 'plantuml'
  | 'smiles';

interface TiptapJsonContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapJsonContent[];
}

type VditorDiagramRenderer = typeof Vditor & {
  abcRender: (element: HTMLElement | Document, cdn?: string) => void;
  chartRender: (
    element: HTMLElement | Document,
    cdn?: string,
    theme?: string
  ) => void;
  flowchartRender: (element: HTMLElement | Document, cdn?: string) => void;
  graphvizRender: (element: HTMLElement | Document, cdn?: string) => void;
  markmapRender: (element: HTMLElement | Document, cdn?: string) => void;
  mermaidRender: (
    element: HTMLElement | Document,
    cdn?: string,
    theme?: string
  ) => void;
  mindmapRender: (
    element: HTMLElement | Document,
    cdn?: string,
    theme?: string
  ) => void;
  plantumlRender: (element: HTMLElement | Document, cdn?: string) => void;
  SMILESRender: (
    element: HTMLElement | Document,
    cdn?: string,
    theme?: string
  ) => void;
};

const diagramLanguages: DiagramLanguage[] = [
  'abc',
  'echarts',
  'flowchart',
  'graphviz',
  'markmap',
  'mermaid',
  'mindmap',
  'plantuml',
  'smiles',
];

function getTheme() {
  return document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'classic';
}

function getVditorDiagramCdn() {
  return import.meta.env.DEV ? '/node_modules/vditor' : VDITOR_CDN;
}

function getCodeBlockLanguage(code: Element): DiagramLanguage | null {
  for (const language of diagramLanguages) {
    if (
      code.classList.contains(`language-${language}`) ||
      code.getAttribute('data-language') === language ||
      code.parentElement?.classList.contains(`language-${language}`) ||
      code.parentElement?.getAttribute('data-language') === language
    ) {
      return language;
    }
  }

  return null;
}

function getCodeBlockNodeLanguage(block: Element): DiagramLanguage | null {
  for (const language of diagramLanguages) {
    if (
      block.getAttribute('data-language')?.toLowerCase() === language ||
      block.classList.contains(`language-${language}`)
    ) {
      return language;
    }
  }

  return null;
}

function normalizeDiagramLanguage(value: unknown): DiagramLanguage | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return diagramLanguages.includes(normalized as DiagramLanguage)
    ? (normalized as DiagramLanguage)
    : null;
}

function collectCodeBlockLanguages(
  node?: TiptapJsonContent
): Array<DiagramLanguage | null> {
  if (!node) {
    return [];
  }

  const languages: Array<DiagramLanguage | null> = [];
  const visit = (current: TiptapJsonContent) => {
    if (current.type === 'codeBlock') {
      languages.push(
        normalizeDiagramLanguage(
          current.attrs?.language ?? current.attrs?.lang ?? current.attrs?.name
        )
      );
    }

    current.content?.forEach(visit);
  };

  visit(node);
  return languages;
}

function createDiagramElement(language: DiagramLanguage, code: string) {
  const diagram = document.createElement('div');
  diagram.className = `language-${language}`;
  const normalizedCode = normalizeDiagramCode(code);
  diagram.textContent = normalizedCode;

  if (language === 'mindmap') {
    diagram.dataset.code = encodeURIComponent(normalizedCode);
  }

  return diagram;
}

function normalizeDiagramCode(code: string) {
  let normalized = code;

  for (let index = 0; index < 10; index += 1) {
    const next = normalized
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\+(["'`{}[\](),:])/g, '$1');

    if (next === normalized) {
      break;
    }

    normalized = next;
  }

  return normalized;
}

function createToggleButton(pre: HTMLElement, language: DiagramLanguage) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'resource-editor-diagram-toggle';
  button.textContent = `Show ${language} source`;
  button.contentEditable = 'false';

  button.addEventListener('click', event => {
    event.preventDefault();
    const expanded = pre.dataset.diagramCollapsed === 'false';
    pre.dataset.diagramCollapsed = expanded ? 'true' : 'false';
    button.textContent = `${expanded ? 'Show' : 'Hide'} ${language} source`;
  });

  return button;
}

function renderVditorDiagram(
  container: HTMLElement,
  language: DiagramLanguage
) {
  const diagramRenderer = Vditor as VditorDiagramRenderer;
  const theme = getTheme();
  const cdn = getVditorDiagramCdn();

  switch (language) {
    case 'abc':
      diagramRenderer.abcRender(container, cdn);
      break;
    case 'echarts':
      diagramRenderer.chartRender(container, cdn, theme);
      break;
    case 'flowchart':
      diagramRenderer.flowchartRender(container, cdn);
      break;
    case 'graphviz':
      diagramRenderer.graphvizRender(container, cdn);
      break;
    case 'markmap':
      diagramRenderer.markmapRender(container, cdn);
      break;
    case 'mermaid':
      diagramRenderer.mermaidRender(container, cdn, theme);
      break;
    case 'mindmap':
      diagramRenderer.mindmapRender(container, cdn, theme);
      break;
    case 'plantuml':
      diagramRenderer.plantumlRender(container, cdn);
      break;
    case 'smiles':
      diagramRenderer.SMILESRender(container, cdn, theme);
      break;
  }
}

function renderCodeBlockNodeDiagrams(
  container: HTMLElement,
  languages: Array<DiagramLanguage | null>,
  startIndex: number
) {
  let rendered = false;
  let codeBlockIndex = startIndex;

  container.querySelectorAll('.code-block-node').forEach(block => {
    const language =
      getCodeBlockNodeLanguage(block) ?? languages[codeBlockIndex] ?? null;
    codeBlockIndex += 1;

    if (!language || block.getAttribute('data-diagram-normalized') === 'true') {
      return;
    }

    const source = block.querySelector('.code-block-node__content');
    if (!source) {
      return;
    }

    const preview = document.createElement('div');
    preview.className = 'resource-editor-diagram-preview';
    preview.contentEditable = 'false';
    preview.append(createDiagramElement(language, source.textContent || ''));

    block.before(preview);
    block.setAttribute('data-diagram-normalized', 'true');
    renderVditorDiagram(preview, language);
    rendered = true;
  });

  return rendered;
}

export function resetReadonlyDiagrams(container: HTMLElement) {
  container
    .querySelectorAll('.resource-editor-diagram-preview')
    .forEach(preview => preview.remove());
  container
    .querySelectorAll('.resource-editor-diagram-toggle')
    .forEach(button => button.remove());
  container.querySelectorAll('pre[data-diagram-normalized]').forEach(pre => {
    delete (pre as HTMLElement).dataset.diagramNormalized;
  });
  container
    .querySelectorAll('.code-block-node[data-diagram-normalized]')
    .forEach(block => {
      block.removeAttribute('data-diagram-normalized');
    });
}

export function renderReadonlyDiagrams(
  container: HTMLElement,
  doc?: TiptapJsonContent
) {
  const codeBlockLanguages = collectCodeBlockLanguages(doc);
  let codeBlockIndex = 0;
  let rendered = false;

  container.querySelectorAll('pre code').forEach(code => {
    const language =
      getCodeBlockLanguage(code) ?? codeBlockLanguages[codeBlockIndex] ?? null;
    codeBlockIndex += 1;

    if (!language) {
      return;
    }

    const pre = code.parentElement;
    if (!pre || pre.dataset.diagramNormalized === 'true') {
      return;
    }

    pre.dataset.diagramCollapsed = 'true';

    const preview = document.createElement('div');
    preview.className = 'resource-editor-diagram-preview';
    preview.contentEditable = 'false';
    preview.append(createDiagramElement(language, code.textContent || ''));

    pre.before(preview);
    pre.after(createToggleButton(pre, language));
    pre.dataset.diagramNormalized = 'true';
    renderVditorDiagram(preview, language);
    rendered = true;
  });

  return (
    renderCodeBlockNodeDiagrams(
      container,
      codeBlockLanguages,
      codeBlockIndex
    ) || rendered
  );
}
