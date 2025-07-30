import React from 'react';
import Copy from './actions/copy';
import Markdown, { ExtraProps } from 'react-markdown';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Citation, MessageStatus } from '@/page/chat/types/chat-response';
import useTheme from '@/hooks/use-theme.ts';
import { useIsMobile } from '@/hooks/use-mobile';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import '@/styles/github-markdown.css';
import 'katex/dist/katex.min.css';
import SyntaxHighlighter from 'react-syntax-highlighter';
import {
  a11yDark,
  a11yLight,
} from 'react-syntax-highlighter/dist/esm/styles/hljs';

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
  const removeGeneratedCite =
    import.meta.env.VITE_REMOVE_GENERATED_CITE === 'TRUE';
  const cleanedContent = trimIncompletedCitation(content);
  const replacedContent = replaceCiteTag(cleanedContent);

  const components = {
    a({ href, children, ...props }: React.ComponentProps<'a'> & ExtraProps) {
      const citeMatch = href?.match(citeLinkRegex);
      if (citeMatch) {
        const id = Number(citeMatch[1]) - 1;
        if (id > 0 && id < citations.length) {
          return <CitationHoverIcon citation={citations[id]} index={id} />;
        } else if (removeGeneratedCite) {
          return null;
        }
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
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

  return (
    <div
      className="markdown-body reset-list"
      style={{ background: 'transparent' }}
    >
      <p className="opacity-60 text-sm">&gt; 此内容由AI生成。</p>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {replacedContent}
      </Markdown>
      {![MessageStatus.PENDING, MessageStatus.STREAMING].includes(status) && (
        <div className="flex ml-[-6px] mt-[-10px]">
          <Copy content={content} />
        </div>
      )}
    </div>
  );
}
