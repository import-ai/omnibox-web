import '@/styles/github-markdown.css';
import 'katex/dist/katex.min.css';

import React from 'react';
import Markdown, { ExtraProps } from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import {
  a11yDark,
  a11yLight,
} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import Copy from '@/components/copy';
import Retry from '@/components/retry';
import { useIsMobile } from '@/hooks/use-mobile';
import useTheme from '@/hooks/use-theme.ts';
import Save from '@/page/chat/components/save';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Citation, MessageStatus } from '@/page/chat/types/chat-response';
import type { ConversationDetail } from '@/page/chat/types/conversation';

import { ChatActionType } from '../../chat-input/types';

const citeLinkRegex = /^#cite-(\d+)$/;
const citePattern = / *\[\[(\d+)]]/g;

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

/**
 * Replace citation tag
 * @param input
 * @param removeGeneratedCite
 * @param citesCount
 */
export function replaceCiteTag(
  input: string,
  removeGeneratedCite: boolean,
  citesCount: number
): string {
  return input.replace(citePattern, (_, i) => {
    const id = Number(i) - 1;
    if ((id >= 0 && id < citesCount) || !removeGeneratedCite) {
      return `[[${i}]](#cite-${i})`;
    }
    return '';
  });
}

function copyPreprocess(content: string, citations: Citation[]): string {
  let citationsFooter: string = '';
  const origin = location.origin;
  const namespace = location.pathname.split('/')[1] || 'default';

  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];
    const title = citation.title.replace('"', '\\"');
    const link = citation.link.startsWith('http')
      ? citation.link
      : `${origin}/${namespace}/${citation.link}`;
    citationsFooter += `[${i + 1}]: ${link} "${title}"\n`;
  }

  if (citationsFooter) {
    content = content + '\n\n' + citationsFooter;
  }

  return content.replace(citePattern, (_, index) => {
    const citationIndex = Number(index) - 1;
    if (citationIndex >= 0 && citationIndex < citations.length) {
      return `[^${index}][${index}]`;
    }
    return '';
  });
}

interface IProps {
  content: string;
  citations: Citation[];
  status: MessageStatus;
  conversation: ConversationDetail;
  messageId: string;
  onAction: (
    action?: ChatActionType,
    reValue?: string,
    parentMessageId?: string
  ) => void;
}

export function CitationMarkdown(props: IProps) {
  const { content, status, citations, conversation, messageId, onAction } =
    props;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const removeGeneratedCite =
    import.meta.env.VITE_REMOVE_GENERATED_CITE?.toLowerCase() !== 'false';
  const cleanedContent = trimIncompletedCitation(content);
  const replacedContent = replaceCiteTag(
    cleanedContent,
    removeGeneratedCite,
    citations.length
  );

  const components = {
    a({ href, children, ...props }: React.ComponentProps<'a'> & ExtraProps) {
      const { node } = props;
      const citeMatch = href?.match(citeLinkRegex);
      if (citeMatch) {
        const id = Number(citeMatch[1]) - 1;
        return <CitationHoverIcon citation={citations[id]} index={id} />;
      }
      if (
        node &&
        node.properties &&
        (!node.properties.target || node.properties.target !== 'blank')
      ) {
        return (
          <a href={href} target="_blank">
            {children}
          </a>
        );
      }
      return <a href={href}>{children}</a>;
    },
    table({ children, ...props }: React.ComponentProps<'table'> & ExtraProps) {
      return (
        <div
          className="overflow-x-auto"
          style={isMobile ? { width: 'calc(100vw - 2rem)' } : { width: '100%' }}
        >
          <table {...props} style={{ maxWidth: 'max-content' }}>
            {children}
          </table>
        </div>
      );
    },
    code({
      children,
      className,
      ...props
    }: React.ComponentProps<'code'> & ExtraProps) {
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <div className="overflow-x-auto max-w-full md:text-sm text-xs">
          <SyntaxHighlighter
            PreTag="div"
            language={match[1]}
            style={theme.content === 'dark' ? a11yDark : a11yLight}
            showLineNumbers={!isMobile}
            customStyle={{
              background: 'transparent',
              whiteSpace: isMobile ? 'pre-wrap' : 'pre',
              wordBreak: isMobile ? 'break-all' : 'normal',
            }}
            wrapLongLines={isMobile}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code {...props} className={className}>
          {children}
        </code>
      );
    },
  };

  console.log('replacedContentreplacedContent', replacedContent);

  return (
    <div
      className="markdown-body reset-list"
      style={{ background: 'transparent' }}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {replacedContent}
      </Markdown>
      {![MessageStatus.PENDING, MessageStatus.STREAMING].includes(status) && (
        <div className="flex items-center ml-[-6px] mt-[-10px]">
          <Copy content={copyPreprocess(content, citations)} />
          <Save
            conversation={conversation}
            content={copyPreprocess(content, citations)}
          />
          <Retry
            messageId={messageId}
            conversation={conversation}
            onAction={onAction}
          />
        </div>
      )}
    </div>
  );
}
