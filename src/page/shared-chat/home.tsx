import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { ChatMode, ToolType } from '@/page/chat/chat-input/types';

import ChatArea from './chat-input';
import useContext from './useContext';

export default function SharedChatHomePage() {
  const app = useApp();
  const params = useParams();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const shareId = params.share_id || '';
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
