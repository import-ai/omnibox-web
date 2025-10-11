import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { ChatMode, ToolType } from '@/page/chat/chat-input/types';

import ChatArea from './chat-input';
import useContext from './useContext';
import { getGreeting } from './utils';

export default function ChatHomePage() {
  const app = useApp();
  const params = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const namespaceId = params.namespace_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const { context, onContextChange } = useContext();
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [tools, onToolsChange] = useState<Array<ToolType>>([
    ToolType.PRIVATE_SEARCH,
  ]);
  const handleAction = () => {
    http.post(`/namespaces/${namespaceId}/conversations`).then(conversation => {
      sessionStorage.setItem(
        'state',
        JSON.stringify({
          mode,
          value,
          tools,
          context,
          conversation,
        })
      );
      navigate(`/${namespaceId}/chat/${conversation.id}`);
    });
  };

  useEffect(() => {
    app.fire('chat:title');
  }, []);

  return (
    <div className="flex justify-center flex-1 p-4 overflow-auto">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <div className="flex flex-col justify-center h-full mb-40">
          <h1 className="text-[28px] text-[#171717] text-center mb-[32px] font-medium dark:text-white">
            <Typewriter text={t(i18n)} typeSpeed={32} />
          </h1>
          <ChatArea
            mode={mode}
            tools={tools}
            value={value}
            loading={false}
            context={context}
            setMode={setMode}
            onChange={onChange}
            onAction={handleAction}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
          />
        </div>
      </div>
    </div>
  );
}
