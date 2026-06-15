import { VDITOR_CDN } from '@/const';

import type { DiagramLanguage } from './diagramLanguage';

interface MermaidRenderResult {
  bindFunctions?: (element: Element) => void;
  svg: string;
}

interface MermaidApi {
  initialize: (options: Record<string, unknown>) => void;
  render: (
    id: string,
    text: string
  ) => MermaidRenderResult | Promise<MermaidRenderResult>;
}

interface EchartsInstance {
  dispose: () => void;
  resize: () => void;
  setOption: (option: unknown) => void;
}

interface EchartsApi {
  init: (element: HTMLElement, theme?: string) => EchartsInstance;
}

declare global {
  interface Window {
    echarts?: EchartsApi;
    mermaid?: MermaidApi;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(src: string, id: string) {
  const existingPromise = scriptPromises.get(id);

  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');

    script.async = true;
    script.id = id;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(src));

    document.head.appendChild(script);
  });

  scriptPromises.set(id, promise);

  return promise;
}

function createRenderId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function renderMermaid(
  container: HTMLElement,
  code: string,
  dark: boolean
) {
  await loadScript(
    `${VDITOR_CDN}/dist/js/mermaid/mermaid.min.js?v=11.6.0`,
    'omniboxMermaidScript'
  );

  const mermaid = window.mermaid;

  if (!mermaid) {
    throw new Error('mermaid');
  }

  mermaid.initialize({
    altFontFamily: 'sans-serif',
    fontFamily: 'sans-serif',
    gantt: {
      leftPadding: 75,
      rightPadding: 20,
    },
    flowchart: {
      htmlLabels: true,
      useMaxWidth: true,
    },
    securityLevel: 'loose',
    sequence: {
      boxMargin: 8,
      diagramMarginX: 8,
      diagramMarginY: 8,
      showSequenceNumbers: true,
      useMaxWidth: true,
    },
    startOnLoad: false,
    ...(dark ? { theme: 'dark' } : {}),
  });

  const result = await mermaid.render(createRenderId('omnibox-mermaid'), code);

  container.innerHTML = result.svg;
  result.bindFunctions?.(container);
}

function parseEchartsOption(code: string) {
  return Function(`"use strict";return (${code})`)();
}

async function renderEcharts(
  container: HTMLElement,
  code: string,
  dark: boolean
) {
  await loadScript(
    `${VDITOR_CDN}/dist/js/echarts/echarts.min.js?v=5.5.1`,
    'omniboxEchartsScript'
  );

  const echarts = window.echarts;

  if (!echarts) {
    throw new Error('echarts');
  }

  const chartElement = document.createElement('div');

  chartElement.className = 'min-h-[260px] w-full';
  container.appendChild(chartElement);

  const chart = echarts.init(chartElement, dark ? 'dark' : undefined);

  chart.setOption(parseEchartsOption(code));

  const resizeObserver = new ResizeObserver(() => chart.resize());

  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    chart.dispose();
  };
}

export async function renderDiagram(
  container: HTMLElement,
  language: DiagramLanguage,
  code: string,
  dark: boolean
) {
  container.innerHTML = '';

  if (!code.trim()) {
    return undefined;
  }

  if (language === 'mermaid') {
    await renderMermaid(container, code, dark);
    return undefined;
  }

  return renderEcharts(container, code, dark);
}
