import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import ChatArea from '@/page/chat/chat-input';
import { InputMode } from '@/page/chat/chat-input/types.tsx';
import { getGreeting } from '@/page/chat/utils';
import { useShareContext } from '@/page/share';

export default function SharedChatHomePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shareId = params.share_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const {
    selectedResources,
    setSelectedResources,
    mode,
    setMode,
    tools,
    setTools,
  } = useShareContext();

  useEffect(() => {
    setDocumentTitle(t('chat.title'));
  }, [t]);

  const callbacks = {
    sendMessage: (query: string) => {
      http.post(`/shares/${shareId}/conversations`).then(conversation => {
        sessionStorage.setItem(
          'shared-chat-state',
          JSON.stringify({
            mode,
            query,
            tools,
            context: selectedResources,
          })
        );
        navigate(`/s/${shareId}/chat/${conversation.id}`);
      });
    },
    stopStreaming: () => {},
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-0 w-full p-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-[28px] text-center mb-[32px] font-medium">
          <Typewriter text={t(i18n)} typeSpeed={32} />
        </h1>
        <ChatArea
          mode={mode}
          tools={tools}
          loading={false}
          context={selectedResources}
          inputMode={InputMode.TEXT}
          pendingInterrupts={[]}
          onDecision={() => {}}
          setMode={setMode}
          callbacks={callbacks}
          onToolsChange={setTools}
          onContextChange={setSelectedResources}
          navigatePrefix={`/s/${shareId}`}
        />
      </div>
    </div>
  );
}
