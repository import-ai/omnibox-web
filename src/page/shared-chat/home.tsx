import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import ChatArea from '@/page/chat/chat-input';
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
    chatInput,
    setChatInput,
    mode,
    setMode,
    tools,
    setTools,
  } = useShareContext();

  useEffect(() => {
    setDocumentTitle(t('chat.title'));
  }, [t]);

  const handleAction = () => {
    http.post(`/shares/${shareId}/conversations`).then(conversation => {
      navigate(`/s/${shareId}/chat/${conversation.id}`);
    });
  };

  return (
    <div className="flex justify-center items-center h-screen p-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-[28px] text-center mb-[32px] font-medium">
          <Typewriter text={t(i18n)} typeSpeed={32} />
        </h1>
        <ChatArea
          mode={mode}
          tools={tools}
          value={chatInput}
          loading={false}
          context={selectedResources}
          setMode={setMode}
          onChange={setChatInput}
          onAction={handleAction}
          onToolsChange={setTools}
          onContextChange={setSelectedResources}
          navigatePrefix={`/s/${shareId}`}
        />
      </div>
    </div>
  );
}
