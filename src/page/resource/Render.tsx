import '@import-ai/omnibox-editor/style.css';
import './resourceEditor.css';

import {
  contentToTiptapJson,
  OmniboxEditor,
  type TiptapJsonContent,
} from '@import-ai/omnibox-editor';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { Markdown } from '@/components/markdown';
import useTheme from '@/hooks/useTheme';
import { Resource, SharedResource } from '@/interface';
import {
  ENABLE_OMNIBOX_EDITOR,
  OMNIBOX_EDITOR_CONTENT_WIDTH,
} from '@/page/resource/editor/const';

import { embedImage } from './utils';

interface IProps {
  resource: Resource | SharedResource;
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

function MarkdownRender(props: IProps) {
  const { resource, linkBase, style } = props;
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query');
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightSearchText = (container: HTMLElement, searchText: string) => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    const nodesToHighlight: { node: Node; text: string }[] = [];
    let node;

    while ((node = walker.nextNode())) {
      if (
        node.textContent &&
        node.textContent.toLowerCase().includes(searchText.toLowerCase())
      ) {
        nodesToHighlight.push({ node, text: node.textContent });
      }
    }

    nodesToHighlight.forEach(({ node, text }) => {
      const parent = node.parentElement;
      if (!parent) {
        return;
      }

      const regex = new RegExp(`(${searchText})`, 'gi');
      const highlightedHTML = text.replace(
        regex,
        '<mark style="background-color:#ffeb3b;padding:2px 0;">$1</mark>'
      );

      const span = document.createElement('span');
      span.innerHTML = highlightedHTML;
      parent.replaceChild(span, node);
    });
  };
  const scrollToSearchResult = useCallback(() => {
    if (!search || !containerRef.current) {
      return;
    }

    setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const allTextNodes: Node[] = [];
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (
          node.textContent &&
          node.textContent.toLowerCase().includes(search.toLowerCase())
        ) {
          allTextNodes.push(node);
        }
      }

      if (allTextNodes.length > 0) {
        const firstMatch = allTextNodes[0].parentElement;
        if (firstMatch) {
          firstMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          highlightSearchText(container, search);
        }
      }
    }, 100);
  }, [search]);

  return (
    <div ref={containerRef} className="pb-[30vh]">
      <Markdown
        style={style}
        content={embedImage(resource)}
        linkBase={linkBase}
        onRendered={scrollToSearchResult}
      />
    </div>
  );
}

function OmniboxRender(props: IProps) {
  const { resource, linkBase, style } = props;
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query');
  const containerRef = useRef<HTMLDivElement>(null);
  const content = useMemo(
    () => getResourceEditorContent(resource, linkBase),
    [linkBase, resource]
  );
  const highlightSearchText = (container: HTMLElement, searchText: string) => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    const nodesToHighlight: { node: Node; text: string }[] = [];
    let node;

    while ((node = walker.nextNode())) {
      if (
        node.textContent &&
        node.textContent.toLowerCase().includes(searchText.toLowerCase())
      ) {
        nodesToHighlight.push({ node, text: node.textContent });
      }
    }

    nodesToHighlight.forEach(({ node, text }) => {
      const parent = node.parentElement;
      if (!parent) {
        return;
      }

      const regex = new RegExp(`(${searchText})`, 'gi');
      const highlightedHTML = text.replace(
        regex,
        '<mark style="background-color:#ffeb3b;padding:2px 0;">$1</mark>'
      );

      const span = document.createElement('span');
      span.innerHTML = highlightedHTML;
      parent.replaceChild(span, node);
    });
  };
  const scrollToSearchResult = useCallback(() => {
    if (!search || !containerRef.current) {
      return;
    }

    setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const allTextNodes: Node[] = [];
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        if (
          node.textContent &&
          node.textContent.toLowerCase().includes(search.toLowerCase())
        ) {
          allTextNodes.push(node);
        }
      }

      if (allTextNodes.length > 0) {
        const firstMatch = allTextNodes[0].parentElement;
        if (firstMatch) {
          firstMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          highlightSearchText(container, search);
        }
      }
    }, 100);
  }, [search]);

  useEffect(() => {
    if (!search) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    let frame = 0;
    let timeout = 0;

    const scrollWhenReady = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(scrollToSearchResult);
    };

    const observer = new MutationObserver(scrollWhenReady);
    observer.observe(container, { childList: true, subtree: true });
    scrollWhenReady();
    timeout = window.setTimeout(() => {
      scrollWhenReady();
      observer.disconnect();
    }, 1500);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [content, scrollToSearchResult]);

  return (
    <div
      ref={containerRef}
      style={style}
      className="resource-readonly-editor pb-[30vh]"
    >
      <ResourceOmniboxEditor
        key={resource.id}
        editable={false}
        content={content}
        linkBase={linkBase}
        locale={i18n.language}
        theme={theme.content}
        variant="embedded"
        contentWidth={OMNIBOX_EDITOR_CONTENT_WIDTH}
        showHeader={false}
        showToc={false}
        debug={true}
      />
    </div>
  );
}

export default function Render(props: IProps) {
  return ENABLE_OMNIBOX_EDITOR ? (
    <OmniboxRender {...props} />
  ) : (
    <MarkdownRender {...props} />
  );
}
