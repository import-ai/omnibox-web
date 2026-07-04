import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';
import { Spinner } from '@/components/ui/Spinner';
import useConfig from '@/hooks/useConfig';
import { AgentTrial } from '@/page/chat/agent-trial/AgentTrial';
import ChatArea from '@/page/chat/chat-input';
import useContext from '@/page/chat/conversation/useContext';
import type { MessageDetail } from '@/page/chat/core/types/conversation';
import { Messages } from '@/page/chat/messages';
import { buildMessageIndexItems } from '@/page/chat/messages/messageGroups';

import Scrollbar from './Scrollbar';

function MessageIndex({ messages }: { messages: MessageDetail[] }) {
  const items = useMemo(() => buildMessageIndexItems(messages), [messages]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Message index"
      className="sticky top-4 hidden w-10 shrink-0 self-start pt-8 lg:flex"
    >
      <div className="flex max-h-[calc(100vh-16rem)] flex-col items-center gap-1 overflow-y-auto py-2">
        {items.map(item => (
          <HoverCard key={item.id} closeDelay={100} openDelay={100}>
            <HoverCardTrigger asChild>
              <a
                aria-label={item.query}
                className="group flex h-4 w-8 items-center justify-center"
                href={`#message-${item.targetMessageId}`}
              >
                <span className="h-0.5 w-3 rounded-full bg-muted-foreground/35 transition-all group-hover:w-7 group-hover:bg-foreground" />
              </a>
            </HoverCardTrigger>
            <HoverCardContent align="center" className="w-80 p-3" side="right">
              <p className="line-clamp-2 text-sm font-medium">{item.query}</p>
              <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                {item.answer}
              </p>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </nav>
  );
}

export default function ChatConversationPage() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const {
    loading,
    regeneratingParentId,
    messages,
    namespaceId,
    conversation,
    messageOperator,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    onRegenerate,
    onEdit,
    sendMessage,
  } = useContext();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Scrollbar contentClassName="max-w-5xl">
        {messages.length <= 0 ? (
          <div className="space-y-4 flex justify-end items-center">
            <Button disabled size="sm" variant="secondary">
              <Spinner />
            </Button>
          </div>
        ) : (
          <div className="flex w-full justify-center gap-4">
            <MessageIndex messages={messages} />
            <div className="min-w-0 max-w-3xl flex-1">
              <Messages
                conversation={conversation}
                messages={messages}
                messageOperator={messageOperator}
                onRegenerate={onRegenerate}
                onEdit={onEdit}
                regeneratingParentId={regeneratingParentId}
              />
            </div>
          </div>
        )}
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="max-w-3xl w-full">
          {config.commercial && (
            <AgentTrial namespaceId={namespaceId} messages={messages} />
          )}
          <ChatArea
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            messages={messages}
            navigatePrefix={`/${namespaceId}`}
            initialApprovalMode={initialApprovalMode}
            approvalModeResetKey={conversation.id}
            sendMessage={sendMessage}
            loading={loading}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
