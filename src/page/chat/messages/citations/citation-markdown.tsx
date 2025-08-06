import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Copy from './actions/copy';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Citation, MessageStatus } from '@/page/chat/types/chat-response';
import useTheme from '@/hooks/use-theme.ts';
import { useIsMobile } from '@/hooks/use-mobile';
import '@/styles/github-markdown.css';
import 'katex/dist/katex.min.css';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import { LAZY_LOAD_IMAGE, VDITOR_CDN } from '@/const';
import { addReferrerPolicyForString } from '@/lib/add-referrer-policy';
import { markdownPreviewConfig } from '@/components/markdown';

const citeLinkRegex = /^#cite-(\d+)$/;
const citePattern = /\[\[(\d+)]]/g;

export function trimIncompletedCitation(text: string) {
  const citePrefix = '[[';
  const citePrefixRegexList = [/\[\[\d+$/g, /\[\[\d+]$/g];
  for (let i = citePrefix.length - 1; i >= 0; i--) {
    const suffix = citePrefix.slice(0, i + 1);
    if (text.endsWith(suffix)) {
      return text.slice(0, -suffix.length);
    }
  }
  for (const regex of citePrefixRegexList) {
    if (regex.test(text)) {
      return text.replace(regex, '');
    }
  }
  return text;
}

export function replaceCiteTag(input: string): string {
  return input.replace(citePattern, (_, i) => `[[${i}]](#cite-${i})`);
}

interface IProps {
  content: string;
  citations: Citation[];
  status: MessageStatus;
}

export function CitationMarkdown(props: IProps) {
  const { content, status, citations } = props;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const previewRef = useRef<HTMLDivElement>(null);
  const [citationElements, setCitationElements] = useState<HTMLElement[]>([]);
  const removeGeneratedCite =
    import.meta.env.VITE_REMOVE_GENERATED_CITE === 'TRUE';
  const cleanedContent = trimIncompletedCitation(content);
  const replacedContent = replaceCiteTag(cleanedContent);

  useEffect(() => {
    const renderMarkdown = async () => {
      if (!previewRef.current) return;

      const vditorOptions = {
        ...(VDITOR_CDN ? { cdn: VDITOR_CDN } : {}),
        ...markdownPreviewConfig(theme),
        theme: {
          current: theme.content,
        },
        anchor: 0, // Disable heading anchors for citations
        mode: theme.content,
        transform: addReferrerPolicyForString,
        lazyLoadImage: LAZY_LOAD_IMAGE,
        hljs: {
          ...markdownPreviewConfig(theme).hljs,
          lineNumber: !isMobile, // Override line numbers based on mobile
        },
        after: () => {
          if (!previewRef.current) return;

          // Handle table responsiveness
          const tables = previewRef.current.querySelectorAll('table');
          tables.forEach(table => {
            if (!table.parentElement?.classList.contains('overflow-x-auto')) {
              const wrapper = document.createElement('div');
              wrapper.className = 'overflow-x-auto';
              wrapper.style.width = isMobile ? 'calc(100vw - 2rem)' : '100%';
              table.parentNode?.insertBefore(wrapper, table);
              wrapper.appendChild(table);
              table.style.maxWidth = 'max-content';
            }
          });

          // Handle code block styling for mobile
          if (isMobile) {
            const codeBlocks =
              previewRef.current.querySelectorAll('pre > code');
            codeBlocks.forEach(code => {
              const pre = code.parentElement;
              if (pre) {
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.wordBreak = 'break-all';
              }
            });
          }

          // Process citations by creating placeholder elements for React portals
          const citationLinks =
            previewRef.current.querySelectorAll('a[href^="#cite-"]');
          const elements: HTMLElement[] = [];

          citationLinks.forEach(link => {
            const href = link.getAttribute('href');
            const citeMatch = href?.match(citeLinkRegex);
            if (citeMatch) {
              const id = Number(citeMatch[1]) - 1;
              if (id >= 0 && id < citations.length) {
                // Create a span element to replace the link
                const citationElement = document.createElement('span');
                citationElement.setAttribute('data-citation-id', id.toString());
                citationElement.className = 'citation-portal';
                link.parentNode?.replaceChild(citationElement, link);
                elements.push(citationElement);
              } else if (removeGeneratedCite) {
                link.remove();
              }
            }
          });

          setCitationElements(elements);
        },
      };

      try {
        await Vditor.preview(
          previewRef.current,
          replacedContent,
          vditorOptions
        );
      } catch (error) {
        console.error('Vditor preview error:', error);
        previewRef.current.innerHTML = `<pre>${replacedContent}</pre>`;
        setCitationElements([]);
      }
    };

    renderMarkdown();
  }, [
    replacedContent,
    theme.content,
    isMobile,
    citations,
    removeGeneratedCite,
  ]);

  return (
    <div className="reset-list" style={{ background: 'transparent' }}>
      <div ref={previewRef} />

      {/* Render CitationHoverIcon components using React portals */}
      {citationElements.map((element, index) => {
        const citationId = parseInt(
          element.getAttribute('data-citation-id') || '0',
          10
        );
        if (citationId >= 0 && citationId < citations.length) {
          return createPortal(
            <CitationHoverIcon
              citation={citations[citationId]}
              index={citationId}
            />,
            element,
            `citation-${citationId}-${index}`
          );
        }
        return null;
      })}

      {![MessageStatus.PENDING, MessageStatus.STREAMING].includes(status) && (
        <div className="flex ml-[-6px] mt-[-10px]">
          <Copy content={content} />
        </div>
      )}
    </div>
  );
}
