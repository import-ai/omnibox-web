import type { TFunction } from 'i18next';
import { ChevronRight, ScrollText } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import { MessageOperator } from '@/page/chat/core/messageOperator.ts';
import {
  type Citation,
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import { AssistantMessage } from '@/page/chat/messages/role/AssistantMessage';
import { ToolMessage } from '@/page/chat/messages/role/ToolMessage';
import { UserMessage } from '@/page/chat/messages/role/UserMessage';

import {
  buildMessageDisplayItems,
  getCollapsedProcessDurationSeconds,
  type MessageDisplayItem,
} from './messageGroups';

interface IProps {
  conversation: ConversationDetail;
  messages: MessageDetail[];
  messageOperator: MessageOperator;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  regeneratingParentId?: string | null;
}

function renderMessage(
  message: MessageDetail,
  messages: MessageDetail[],
  citations: Citation[],
  conversation: ConversationDetail,
  messageOperator: MessageOperator,
  onRegenerate: (messageId: string) => void,
  onEdit: (messageId: string, newContent: string) => void,
  isLastMessage: boolean,
  regeneratingParentId: string | null
) {
  const openAIMessage = message.message;

  if (
    openAIMessage.role === OpenAIMessageRole.USER &&
    (message.attrs?.tool_call?.decisions ?? []).length === 0
  ) {
    return (
      <UserMessage
        message={message}
        messageOperator={messageOperator}
        onEdit={onEdit}
      />
    );
  }
  if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
    const parentId = messageOperator.getParent(message.id);
    return (
      <AssistantMessage
        message={message}
        messages={messages}
        citations={citations}
        conversation={conversation}
        messageOperator={messageOperator}
        onRegenerate={onRegenerate}
        isLastMessage={isLastMessage}
        regenerateDisabled={Boolean(regeneratingParentId)}
        regenerating={regeneratingParentId === parentId}
      />
    );
  }
  if (openAIMessage.role === OpenAIMessageRole.TOOL) {
    return <ToolMessage citations={citations} message={message} />;
  }
  return <></>;
}

function formatProcessDuration(seconds: number, t: TFunction) {
  const totalSeconds = Math.max(0, seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(t('chat.messages.process.duration.hours', { count: hours }));
  }
  if (minutes > 0) {
    parts.push(t('chat.messages.process.duration.minutes', { count: minutes }));
  }
  if (restSeconds > 0 || parts.length === 0) {
    parts.push(
      t('chat.messages.process.duration.seconds', { count: restSeconds })
    );
  }

  return parts.join(' ');
}

function ContextCompactedDivider({
  status,
}: {
  status: 'compacting' | 'compacted';
}) {
  const { t } = useTranslation();
  const isCompacting = status === 'compacting';

  return (
    <div className="flex items-center gap-3 py-4 text-muted-foreground">
      <Separator className="flex-1" />
      <div className="flex items-center gap-2 text-sm">
        {isCompacting ? <Spinner /> : <ScrollText className="size-4" />}
        <span>
          {t(
            isCompacting
              ? 'chat.messages.context_compacting'
              : 'chat.messages.context_compacted'
          )}
        </span>
      </div>
      <Separator className="flex-1" />
    </div>
  );
}

function CollapsedProcessMessages({
  item,
  children,
}: {
  item: Extract<MessageDisplayItem, { type: 'collapsed_process' }>;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const durationSeconds = getCollapsedProcessDurationSeconds(
    item.messages,
    item.finalMessage
  );
  const summary =
    durationSeconds === undefined
      ? t('chat.messages.process.message_count', {
          count: item.messages.length,
        })
      : t('chat.messages.process.worked_for', {
          duration: formatProcessDuration(durationSeconds, t),
        });

  return (
    <details className="group border-b border-border/60 pb-3">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-3 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="space-y-4 pb-3">{children}</div>
    </details>
  );
}

export function Messages(props: IProps) {
  const {
    messages,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    regeneratingParentId = null,
  } = props;
  const citations = React.useMemo((): Citation[] => {
    const result: Citation[] = [];
    for (const message of messages) {
      if (message.attrs?.citations && message.attrs.citations.length > 0) {
        message.attrs.citations.forEach(citation => {
          result.push(citation);
        });
      }
    }
    return result;
  }, [messages]);

  const filteredMessages = messages.filter(
    message => message.message.role !== OpenAIMessageRole.SYSTEM
  );
  const displayItems = buildMessageDisplayItems(filteredMessages);

  // Find the index of the last assistant message
  const lastAssistantIndex = filteredMessages.reduce((lastIndex, msg, idx) => {
    return msg.message.role === OpenAIMessageRole.ASSISTANT ? idx : lastIndex;
  }, -1);

  function renderMessageBlock(message: MessageDetail, isLastInList: boolean) {
    const filteredIndex = filteredMessages.indexOf(message);
    const isLastAssistantMessage =
      message.message.role === OpenAIMessageRole.ASSISTANT &&
      filteredIndex === lastAssistantIndex;
    const isCompacting = message.attrs?.compact?.status === 'compacting';
    const shouldRenderMessage = !(isCompacting && !message.message.content);

    return (
      <div key={message.id}>
        {message.attrs?.compact && (
          <ContextCompactedDivider status={message.attrs.compact.status} />
        )}
        {shouldRenderMessage &&
          renderMessage(
            message,
            messages,
            citations,
            conversation,
            messageOperator,
            onRegenerate,
            onEdit,
            isLastAssistantMessage,
            regeneratingParentId
          )}
        {message.status === MessageStatus.FAILED &&
          message.attrs?.error_message && (
            <div className="text-destructive mt-2">
              {message.attrs.error_message}
            </div>
          )}
        {!isLastInList &&
          ![OpenAIMessageRole.TOOL, OpenAIMessageRole.USER].includes(
            message.message.role
          ) && <div className="py-4" />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayItems.map((item, index) => {
        if (item.type === 'collapsed_process') {
          return (
            <CollapsedProcessMessages
              key={`process_${item.messages[0].id}`}
              item={item}
            >
              {item.messages.map((message, processIndex) =>
                renderMessageBlock(
                  message,
                  processIndex === item.messages.length - 1
                )
              )}
            </CollapsedProcessMessages>
          );
        }

        return renderMessageBlock(
          item.message,
          index === displayItems.length - 1
        );
      })}
    </div>
  );
}
