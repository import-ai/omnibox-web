import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Typewriter } from '@/components/typewriter';
import useApp from '@/hooks/use-app';
import useUser from '@/hooks/use-user';
import { http } from '@/lib/request';
import { ChatMode, ToolType } from '@/page/chat/chat-input/types';

import { getGreeting } from '../chat/utils';
import ChatArea from './chat-input';
import useContext from './useContext';

export default function SharedChatHomePage() {
  const app = useApp();
  const params = useParams();
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const shareId = params.share_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const { context, onContextChange } = useContext({ data: [] });
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [tools, onToolsChange] = useState<Array<ToolType>>([
    ToolType.PRIVATE_SEARCH,
  ]);
  const handleAction = () => {
    http.post(`/shares/${shareId}/conversations`).then(conversation => {
      sessionStorage.setItem(
        'sharedState',
        JSON.stringify({
          mode,
          value,
          tools,
          context,
          conversation,
        })
      );
      navigate(`/s/${shareId}/chat/${conversation.id}`);
    });
  };

  useEffect(() => {
    app.fire('chat:title');
  }, []);

  return (
    <div className="flex justify-center h-full p-4">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <div className="flex flex-col justify-center h-full mb-40 pt-40">
          <h1 className="text-3xl text-center mb-10 font-medium min-h-[3.5rem]">
            {user.username && (
              <Typewriter
                text={t(i18n, {
                  name: user.username,
                })}
                typeSpeed={32}
              />
            )}
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
