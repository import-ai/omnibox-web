import { useState } from 'react';
import { http } from '@/lib/request';
import { useParams, useNavigate } from 'react-router-dom';
import ChatArea from './chat-input';
import useContext from './useContext';
import { ToolType } from '@/page/chat/chat-input/types';
import useUser from '@/hooks/use-user';
import { Typewriter } from '@/components/typewriter';

export default function ChatHomePage() {
  const params = useParams();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const namespaceId = params.namespace_id || '';
  const [tools, onToolsChange] = useState<Array<ToolType>>([]);
  const { context, onContextChange } = useContext({ data: [] });
  const { user } = useUser();
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

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div className="flex flex-col justify-center h-full mb-20">
      <h1 className="text-3xl text-center mb-10 font-medium">
        <Typewriter
          text={getGreeting() + ', ' + user.username}
          typeSpeed={32}
        />
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
