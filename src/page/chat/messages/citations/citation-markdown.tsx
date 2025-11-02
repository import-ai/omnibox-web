import '@/styles/github-markdown.css';
import 'katex/dist/katex.min.css';

import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import useTheme from '@/hooks/use-theme.ts';
import Save from '@/page/chat/components/save';
import { CitationHoverIcon } from '@/page/chat/messages/citations/citation-hover-icon';
import { Citation, MessageStatus } from '@/page/chat/types/chat-response';
import type { ConversationDetail } from '@/page/chat/types/conversation';

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
  onRegenerate: (messageId: string) => void;
  hasSiblings?: boolean;
  currentIndex?: number;
  siblingsLength?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function CitationMarkdown(props: IProps) {
  const {
    content,
    status,
    citations,
    conversation,
    messageId,
    onRegenerate,
    hasSiblings,
    currentIndex,
    siblingsLength,
    onPrevious,
    onNext,
  } = props;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
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
        <div className="flex items-center gap-1 ml-[-6px] mt-[-10px]">
          {hasSiblings && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="p-0 w-4 h-7"
                onClick={onPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
                {(currentIndex ?? 0) + 1}/{siblingsLength}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="p-0 w-4 h-7"
                onClick={onNext}
                disabled={currentIndex === (siblingsLength ?? 1) - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="p-0 w-7 h-7"
                onClick={() => onRegenerate(messageId)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('chat.messages.actions.regenerate')}</p>
            </TooltipContent>
          </Tooltip>
          <Copy content={copyPreprocess(content, citations)} />
          <Save
            conversation={conversation}
            content={copyPreprocess(content, citations)}
          />
        </div>
      )}
    </div>
  );
}
