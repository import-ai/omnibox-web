import { Loader2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import ChatArea from '@/page/chat/chat-input';
import useContext from '@/page/chat/conversation/useContext.ts';
import { Messages } from '@/page/chat/messages';

import Scrollbar from './scrollbar';

export default function ChatConversationPage() {
  const { t } = useTranslation();
  const {
    mode,
    value,
    tools,
    setMode,
    loading,
    context,
    onChange,
    onAction,
    messages,
    onToolsChange,
    onContextChange,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    inputMode,
    pendingInterrupts,
    onToolDecision,
  } = useContext();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Scrollbar>
        {messages.length <= 0 ? (
          <div className="space-y-4 flex justify-end items-center">
            <Button disabled size="sm" variant="secondary">
              <Loader2Icon className="animate-spin" />
            </Button>
          </div>
        ) : (
          <Messages
            conversation={conversation}
            messages={messages}
            messageOperator={messageOperator}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
          />
        )}
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="max-w-3xl w-full">
          <ChatArea
            mode={mode}
            tools={tools}
            value={value}
            setMode={setMode}
            loading={loading}
            context={context}
            inputMode={inputMode}
            pendingInterrupts={pendingInterrupts}
            onChange={onChange}
            onAction={onAction}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
            onDecision={onToolDecision}
            navigatePrefix={`/${namespaceId}`}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
