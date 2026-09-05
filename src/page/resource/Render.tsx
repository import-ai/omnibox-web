import '@import-ai/omnibox-editor/style.css';
import './resourceEditor.css';

import {
  contentToTiptapJson,
  OmniboxEditor,
  type TiptapJsonContent,
} from '@import-ai/omnibox-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';

import { Markdown } from '@/components/markdown';
import useTheme from '@/hooks/useTheme';
import { Resource, SharedResource } from '@/interface';
import { cn } from '@/lib/utils';
import {
  OMNIBOX_EDITOR_CONTENT_WIDTH,
  OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH,
} from '@/page/resource/editor/const';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';

import { parseScrollToLine, scrollRenderedContentToLine } from './scrollToLine';
import {
  findFirstSearchMatchElement,
  highlightSearchText,
} from './searchHighlight';
import { embedImage, getReadonlyResourceEditorKey } from './utils';

interface IProps {
  resource: Resource | SharedResource;
  showToc?: boolean;
  scrollToLine?: number;
  wide?: boolean;
  forceOmniboxEditor?: boolean;
  linkBase?: string;
  style?: React.CSSProperties;
}

type ResourceOmniboxEditorProps = Omit<
  React.ComponentProps<typeof OmniboxEditor>,
  'content'
> & {
  content?: string | TiptapJsonContent;
  locale?: string;
  theme?: 'light' | 'dark';
};

const ResourceOmniboxEditor =
  OmniboxEditor as React.ComponentType<ResourceOmniboxEditorProps>;

function getResourceEditorContent(
  resource: Resource | SharedResource,
  linkBase?: string
): TiptapJsonContent {
  return contentToTiptapJson(embedImage(resource), { linkBase });
}

function useSearchHighlight(
  containerRef: React.RefObject<HTMLDivElement | null>,
  search: string | null,
  /** When this identity changes, allow re-highlight (e.g. document content). */
  contentKey: unknown
) {
  const appliedKeyRef = useRef<string | null>(null);

  const applySearchHighlight = useCallback(() => {
    const container = containerRef.current;
    if (!search || !container) {
      return false;
    }

    const key = `${search}::${String(contentKey ?? '')}`;
    // Re-run is allowed until the first successful highlight for this key,
    // so late editor mounts still get marks without nesting on re-entry.
    if (appliedKeyRef.current === key) {
      const existing = findFirstSearchMatchElement(container, search);
      if (existing) {
        existing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
    }

    const matchCount = highlightSearchText(container, search);
    if (matchCount === 0) {
      return false;
    }

    appliedKeyRef.current = key;
    const first = findFirstSearchMatchElement(container, search);
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }, [containerRef, contentKey, search]);

  useEffect(() => {
    appliedKeyRef.current = null;
    const container = containerRef.current;
    if (container) {
      unwrapSearchMarks(container);
    }
  }, [contentKey, search]);

  function unwrapSearchMarks(container: HTMLElement) {
    const marks = container.querySelectorAll('mark.search-query-mark');
    marks.forEach(mark => {
      const text = mark.textContent;
      if (text) {
        const textNode = document.createTextNode(text);
        mark.replaceWith(textNode);
      }
    });
  }

  return applySearchHighlight;
}

function MarkdownRender(props: IProps) {
  const { resource, linkBase, scrollToLine: requestedLine, style } = props;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query');
  const scrollToLine = requestedLine ?? parseScrollToLine(location.hash);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentKey = embedImage(resource);
  const applySearchHighlight = useSearchHighlight(
    containerRef,
    search,
    contentKey
  );

  const onRendered = useCallback(() => {
    // Markdown may paint after onRendered; one frame is enough.
    window.requestAnimationFrame(() => {
      applySearchHighlight();
      if (containerRef.current && scrollToLine) {
        scrollRenderedContentToLine(
          containerRef.current,
          contentKey,
          scrollToLine
        );
      }
    });
  }, [applySearchHighlight, contentKey, scrollToLine]);

  return (
    <div ref={containerRef} className="pb-[30vh]">
      <Markdown
        style={style}
        content={embedImage(resource)}
        linkBase={linkBase}
        onRendered={onRendered}
      />
    </div>
  );
}

function OmniboxRender(props: IProps) {
  const {
    resource,
    linkBase,
    scrollToLine: requestedLine,
    showToc = true,
    style,
    wide = false,
  } = props;
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query');
  const [isScrollLineVisible, setIsScrollLineVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const content = useMemo(
    () => getResourceEditorContent(resource, linkBase),
    [linkBase, resource]
  );
  const targetScrollToLine = requestedLine ?? parseScrollToLine(location.hash);
  const scrollToLine = isScrollLineVisible ? targetScrollToLine : undefined;

  useEffect(() => {
    setIsScrollLineVisible(true);
  }, [targetScrollToLine]);

  useEffect(() => {
    if (!isScrollLineVisible) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const highlightedElement = containerRef.current?.querySelector(
        '[data-scroll-line-highlight="true"]'
      );
      if (!highlightedElement) {
        return;
      }

      const highlightedBlock = highlightedElement.closest(
        '.tiptap.ProseMirror > *'
      );
      if (highlightedBlock?.contains(event.target)) {
        return;
      }

      setIsScrollLineVisible(false);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isScrollLineVisible]);

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        'resource-readonly-editor pb-[30vh]',
        !isScrollLineVisible &&
          'resource-readonly-editor--scroll-line-dismissed',
        wide && 'resource-readonly-editor--wide'
      )}
    >
      <ResourceOmniboxEditor
        key={getReadonlyResourceEditorKey(resource)}
        editable={false}
        content={content}
        linkBase={linkBase}
        locale={i18n.language}
        theme={theme.content}
        variant="embedded"
        contentWidth={
          wide
            ? OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH
            : OMNIBOX_EDITOR_CONTENT_WIDTH
        }
        showHeader={false}
        showToc={showToc}
        searchTerm={search ?? undefined}
        scrollToLine={scrollToLine}
        scrollToLineContent={embedImage(resource)}
      />
    </div>
  );
}

export default function Render(props: IProps) {
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);

  return useOmniboxEditor ? (
    <OmniboxRender {...props} />
  ) : (
    <MarkdownRender {...props} />
  );
}
