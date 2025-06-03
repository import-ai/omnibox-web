import React, { useEffect } from 'react';
import ReactMarkdown, { ExtraProps } from 'react-markdown';
import { cleanIncompletedCitation } from '@/page/chat/utils';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Citation } from '@/page/chat/types/chat-response';
import useTheme from '@/hooks/use-theme.ts';
import remarkGfm from 'remark-gfm';

type AnchorProps = React.ComponentProps<'a'> & ExtraProps;
const citeLinkRegex = /^#cite-(\d+)$/;

export function replaceCiteTag(input: string, citePattern: RegExp): string {
  return input.replace(citePattern, (_, i) => `[[${i}]](#cite-${i})`);
}

interface IProps {
  content: string;
  citations: Citation[];
  citePattern: RegExp;
  removeGeneratedCite?: boolean;
}

export function CitationMarkdown(props: IProps) {
  const { content, citations, citePattern, removeGeneratedCite } = props;
  const cleanedContent = cleanIncompletedCitation(content);
  const replacedContent = replaceCiteTag(cleanedContent, citePattern);
  const { theme } = useTheme();

  useEffect(() => {
    const id = 'github-markdown-css';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `//esm.sh/github-markdown-css@5/github-markdown-${theme.content}.css`;
    return () => link?.remove();
  }, [theme]);

  const components = {
    a({ href, children, ...props }: AnchorProps) {
      const citeMatch = href?.match(citeLinkRegex);
      if (citeMatch) {
        const id = Number(citeMatch[1]) - 1;
        if (id < citations.length) {
          return <CitationHoverIcon citation={citations[id]} index={id} />;
        } else if (removeGeneratedCite) {
          return <></>;
        }
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className="markdown-body" style={{ background: 'transparent' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {replacedContent}
      </ReactMarkdown>
    </div>
  );
}
