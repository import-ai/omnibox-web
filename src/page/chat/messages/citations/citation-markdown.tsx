import React from 'react';
import ReactMarkdown, { ExtraProps } from 'react-markdown';
import { cleanIncompletedCitation } from '@/page/chat/utils';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Citation } from '@/page/chat/types/chat-response';

type AnchorProps = React.ComponentProps<'a'> & ExtraProps;
const citeLinkRegex = /^#cite-(\d+)$/;

export function replaceCiteTag(input: string, citePattern: RegExp): string {
  return input.replace(citePattern, (_, i) => `[[${i}]](#cite-${i})`);
}

interface IProps {
  content: string;
  citations: Citation[];
  citePattern: RegExp;
}

export function CitationMarkdown(props: IProps) {
  const { content, citations, citePattern } = props;
  const cleanedContent = cleanIncompletedCitation(content);
  const replacedContent = replaceCiteTag(cleanedContent, citePattern);

  const components = {
    a({ href, children, ...props }: AnchorProps) {
      const citeMatch = href?.match(citeLinkRegex);
      console.log({ href, props, citeMatch });
      if (citeMatch) {
        console.log(citeMatch);
        const id = Number(citeMatch[1]) - 1;
        if (id < citations.length) {
          return <CitationHoverIcon citation={citations[id]} index={id} />;
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
    <ReactMarkdown components={components}>{replacedContent}</ReactMarkdown>
  );
}
