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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { useIsMobile } from '@/hooks/useMobile';
import useTheme from '@/hooks/useTheme.ts';
import Save from '@/page/chat/components/SaveMain';
import { Citation, MessageStatus } from '@/page/chat/core/types/chatResponse';
import type { ConversationDetail } from '@/page/chat/core/types/conversation';
import { CitationHoverIcon } from '@/page/chat/messages/citations/CitationHoverIcon';
import {
  citationUrlTransform,
  copyPreprocess,
  findCitationById,
  isCitationId,
  replaceCiteTag,
  trimIncompletedCitation,
} from '@/page/chat/messages/citations/citationUtils';

const citeLinkRegex = /^#cite-(\d+)$/;

interface IProps {
  content: string;
  citations: Citation[];
  status: MessageStatus;
  conversation: ConversationDetail;
  messageId: string;
  onRegenerate: (messageId: string) => void;
  regenerateDisabled?: boolean;
  regenerating?: boolean;
  hasSiblings?: boolean;
  currentIndex?: number;
  siblingsLength?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  isLastMessage: boolean;
}

export function CitationMarkdown(props: IProps) {
  const {
    content,
    status,
    citations,
    conversation,
    messageId,
    onRegenerate,
    regenerateDisabled = false,
    regenerating = false,
    hasSiblings,
    currentIndex,
    siblingsLength,
    onPrevious,
    onNext,
    isLastMessage,
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
      const citationIdMatch = findCitationById(citations, href);
      if (citationIdMatch) {
        return (
          <CitationHoverIcon
            citation={citationIdMatch.citation}
            index={citationIdMatch.index}
          />
        );
      }
      if (isCitationId(href)) {
        return null;
      }
      if (
        node &&
        node.properties &&
        (!node.properties.target || node.properties.target !== 'blank')
      ) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
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
      className="group markdown-body reset-list"
      style={{ background: 'transparent' }}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
        urlTransform={citationUrlTransform}
      >
        {replacedContent}
      </Markdown>
      {![MessageStatus.PENDING, MessageStatus.STREAMING].includes(status) && (
        <div
          className={`flex items-center gap-1 ml-[-6px] mt-[-10px] ${
            isLastMessage
              ? ''
              : 'transition-opacity duration-300 group-hover:duration-75 group-hover:opacity-100 opacity-0'
          }`}
        >
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
                disabled={regenerateDisabled}
                onClick={() => onRegenerate(messageId)}
              >
                <RefreshCw
                  className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`}
                />
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
