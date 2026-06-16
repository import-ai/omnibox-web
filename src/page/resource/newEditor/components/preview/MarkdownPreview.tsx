import 'katex/dist/katex.min.css';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import { useNavigate } from 'react-router-dom';
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
  navigateInternalLinks?: boolean;
  onRendered?: () => void;
  style?: React.CSSProperties;
}

interface DiagramPreviewProps {
  code: string;
  language: NonNullable<ReturnType<typeof getDiagramLanguage>>;
}

interface PreviewImageProps extends React.ComponentProps<'img'> {
  src: string;
}

function PreviewImage(props: PreviewImageProps) {
  const { alt, className, src, ...imageProps } = props;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <span className="not-prose my-4 inline-flex min-h-24 min-w-24 items-center justify-center align-middle text-slate-400 dark:text-neutral-500">
      {!loaded && (
        <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
      )}
      {!failed && (
        <img
          {...imageProps}
          alt={alt ?? ''}
          className={cn(className, !loaded && 'hidden')}
          referrerPolicy="same-origin"
          src={src}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
        />
      )}
    </span>
  );
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
  const {
    content,
    linkBase = '',
    navigateInternalLinks,
    onRendered,
    style,
  } = props;
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRendered?.();
  }, [content, onRendered]);

  useEffect(() => {
    if (!navigateInternalLinks || !previewRef.current) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (!link || !previewRef.current?.contains(link)) {
        return;
      }

      const href = link.getAttribute('href');

      if (!href || !href.startsWith('/')) {
        return;
      }

      event.preventDefault();
      navigate(href);
    };

    previewRef.current.addEventListener('click', handleClick);

    return () => {
      previewRef.current?.removeEventListener('click', handleClick);
    };
  }, [navigate, navigateInternalLinks]);

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
        const nextSrc = resolvePreviewUrl(src, linkBase);

        if (typeof nextSrc !== 'string') {
          return null;
        }

        return <PreviewImage {...imageProps} alt={alt ?? ''} src={nextSrc} />;
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
      ref={previewRef}
      style={style}
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
