import { useState } from 'react';
import { http } from '@/lib/request';
import { useParams, useNavigate } from 'react-router-dom';
import ChatInput from './chat-input';
import useContext from './useContext';

export default function ChatHomePage() {
  const params = useParams();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const namespaceId = params.namespace_id || '';
  const [tools, onToolsChange] = useState<Array<string>>([]);
  const { context, onContextChange } = useContext({ data: [] });
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

  return (
    <div className="flex flex-col justify-center h-full mb-20">
      <h1 className="text-3xl text-center mb-10 font-medium text-[#111111]">
        Good evening, Xie
      </h1>
      <ChatInput
        tools={tools}
        value={value}
        context={context}
        onChange={onChange}
        onAction={handleAction}
        onToolsChange={onToolsChange}
        onContextChange={onContextChange}
      />
    </div>
  );
}
