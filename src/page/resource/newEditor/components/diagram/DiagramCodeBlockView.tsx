import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

import { getDiagramLanguage } from './diagramLanguage';
import { renderDiagram } from './diagramRenderer';

function DiagramCodeBlockView(props: ReactNodeViewProps) {
  const { node, selected } = props;
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const language = getDiagramLanguage(node.attrs.language);
  const code = node.textContent;
  const dark = theme.content === 'dark';

  const codeClassName = useMemo(() => {
    if (typeof node.attrs.language !== 'string' || !node.attrs.language) {
      return undefined;
    }

    return `language-${node.attrs.language}`;
  }, [node.attrs.language]);

  useEffect(() => {
    if (!language || !containerRef.current) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    setRenderError(null);

    renderDiagram(containerRef.current, language, code, dark)
      .then(nextCleanup => {
        if (disposed) {
          nextCleanup?.();
          return;
        }

        cleanup = nextCleanup;
      })
      .catch(error => {
        if (disposed) {
          return;
        }

        setRenderError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [code, dark, language]);

  if (!language) {
    return (
      <NodeViewWrapper as="pre">
        <NodeViewContent as="code" className={codeClassName} />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={cn(
        'not-prose my-4 rounded border bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950',
        selected && 'ring-2 ring-slate-300 dark:ring-neutral-600'
      )}
    >
      <div
        ref={containerRef}
        contentEditable={false}
        className="min-h-[120px] overflow-x-auto"
      />
      {renderError && (
        <div
          contentEditable={false}
          className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200"
        >
          {renderError}
        </div>
      )}
      <details className="mt-2 text-xs text-slate-500">
        <summary contentEditable={false} className="cursor-pointer select-none">
          {language}
        </summary>
        <NodeViewContent
          as="code"
          className={cn(
            codeClassName,
            'mt-2 block whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-700 dark:bg-neutral-900 dark:text-neutral-300'
          )}
        />
      </details>
    </NodeViewWrapper>
  );
}

export default DiagramCodeBlockView;
