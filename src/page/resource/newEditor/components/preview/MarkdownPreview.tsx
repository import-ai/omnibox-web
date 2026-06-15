import 'katex/dist/katex.min.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

import { getDiagramLanguage } from '../diagram/diagramLanguage';
import { renderDiagram } from '../diagram/diagramRenderer';
import { resolvePreviewUrl } from './previewUrl';

interface MarkdownPreviewProps {
  content: string;
  linkBase?: string;
}

interface DiagramPreviewProps {
  code: string;
  language: NonNullable<ReturnType<typeof getDiagramLanguage>>;
}

function DiagramPreview(props: DiagramPreviewProps) {
  const { code, language } = props;
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const dark = theme.content === 'dark';

  useEffect(() => {
    if (!containerRef.current) {
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

  return (
    <div className="not-prose my-4 rounded border bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
      <div ref={containerRef} className="min-h-[120px] overflow-x-auto" />
      {renderError && (
        <div className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
          {renderError}
        </div>
      )}
    </div>
  );
}

export function MarkdownPreview(props: MarkdownPreviewProps) {
  const { content, linkBase = '' } = props;
  const components = useMemo(
    () => ({
      a({
        children,
        href,
        ...linkProps
      }: React.ComponentProps<'a'> & ExtraProps) {
        const nextHref = resolvePreviewUrl(href, linkBase);

        return (
          <a {...linkProps} href={nextHref} rel="noopener noreferrer">
            {children}
          </a>
        );
      },
      img({
        src,
        alt,
        ...imageProps
      }: React.ComponentProps<'img'> & ExtraProps) {
        return (
          <img
            {...imageProps}
            alt={alt ?? ''}
            referrerPolicy="same-origin"
            src={resolvePreviewUrl(src, linkBase)}
          />
        );
      },
      table({
        children,
        ...tableProps
      }: React.ComponentProps<'table'> & ExtraProps) {
        return (
          <div className="overflow-x-auto">
            <table {...tableProps}>{children}</table>
          </div>
        );
      },
      code({
        children,
        className,
        ...codeProps
      }: React.ComponentProps<'code'> & ExtraProps) {
        const match = /language-(\w+)/.exec(className || '');
        const language = getDiagramLanguage(match?.[1]);
        const code = String(children).replace(/\n$/, '');

        if (language) {
          return <DiagramPreview code={code} language={language} />;
        }

        return (
          <code {...codeProps} className={className}>
            {children}
          </code>
        );
      },
    }),
    [linkBase]
  );

  return (
    <div
      className={cn(
        'omnibox-tiptap-preview prose prose-slate max-w-none text-base leading-6 text-slate-900 dark:prose-invert dark:text-slate-100',
        '[&_code::after]:content-none [&_code::before]:content-none'
      )}
    >
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
