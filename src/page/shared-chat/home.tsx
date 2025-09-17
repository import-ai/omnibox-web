import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { http } from '@/lib/request';
import ChatArea from '@/page/chat/chat-input';
import { ChatMode, ToolType } from '@/page/chat/chat-input/types';
import { useShareContext } from '@/page/share';

export default function SharedChatHomePage() {
  const params = useParams();
  const navigate = useNavigate();
  const [value, onChange] = useState('');
  const shareId = params.share_id || '';
  const { selectedResources: context, setSelectedResources: onContextChange } =
    useShareContext();
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [tools, onToolsChange] = useState<Array<ToolType>>([
    ToolType.PRIVATE_SEARCH,
  ]);
  const handleAction = () => {
    http.post(`/shares/${shareId}/conversations`).then(conversation => {
      navigate(`/s/${shareId}/chat/${conversation.id}`);
    });
  };

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
