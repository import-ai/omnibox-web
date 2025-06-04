import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getGreeting } from './utils';
import ChatArea from './chat-input';
import useContext from './useContext';
import useUser from '@/hooks/use-user';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Typewriter } from '@/components/typewriter';
import { ToolType } from '@/page/chat/chat-input/types';
import { useNavigate, useParams } from 'react-router-dom';

export default function ChatHomePage() {
  const app = useApp();
  const params = useParams();
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const namespaceId = params.namespace_id || '';
  const { context, onContextChange } = useContext({ data: [] });
  const [tools, onToolsChange] = useState<Array<ToolType>>([
    ToolType.KNOWLEDGE_SEARCH,
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
          },
        });
      });
  };

  useEffect(() => {
    app.fire('chat:title');
  }, []);

  return (
    <div className="flex flex-col justify-center h-full mb-20">
      <h1 className="text-3xl text-center mb-10 font-medium">
        {user.username && (
          <Typewriter
            text={t('chat.home.greeting.' + getGreeting(), {
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
      />
    </div>
  );
}
