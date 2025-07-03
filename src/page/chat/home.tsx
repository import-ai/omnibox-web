import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getGreeting } from './utils';
import ChatArea from './chat-input';
import useContext from './useContext';
import useUser from '@/hooks/use-user';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typewriter } from '@/components/typewriter';
import { ChatMode, ToolType } from '@/page/chat/chat-input/types';
import { useNavigate, useParams } from 'react-router-dom';

export default function ChatHomePage() {
  const app = useApp();
  const params = useParams();
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const namespaceId = params.namespace_id || '';
  const i18n = `chat.home.greeting.${getGreeting()}`;
  const { context, onContextChange } = useContext({ data: [] });
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [tools, onToolsChange] = useState<Array<ToolType>>([
    ToolType.PRIVATE_SEARCH,
    ToolType.REASONING,
  ]);
  const handleAction = () => {
    http
      .post(`/namespaces/${namespaceId}/conversations`)
      .then((conversation) => {
        navigate(`/${namespaceId}/chat/${conversation.id}`, {
          state: {
            value,
            context,
            tools,
            namespaceId,
            conversationId: conversation.id,
            mode,
          },
        });
      });
  };

  useEffect(() => {
    app.fire('chat:title');
  }, []);

  return (
    <div className="flex justify-center h-full p-4">
      <div className="flex flex-col h-full max-w-3xl w-full">
        <div className="flex flex-col justify-center h-full mb-40">
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
            tools={tools}
            value={value}
            context={context}
            onChange={onChange}
            onAction={handleAction}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
            loading={false}
            mode={mode}
            setMode={setMode}
          />
        </div>
      </div>
    </div>
  );
}
