import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Markdown } from '@/components/markdown';
import { Resource, SharedResource } from '@/interface';

import { embedImage } from './utils';

interface IProps {
  resource: Resource | SharedResource;
  linkBase?: string;
  style?: React.CSSProperties;
}

export default function Render(props: IProps) {
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
