import { useNavigate, useParams } from 'react-router-dom';

import { http } from '@/lib/request';
import ChatArea from '@/page/chat/chat-input';
import { useShareContext } from '@/page/share';

export default function SharedChatHomePage() {
  const params = useParams();
  const navigate = useNavigate();
  const shareId = params.share_id || '';
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
  const handleAction = () => {
    http.post(`/shares/${shareId}/conversations`).then(conversation => {
      navigate(`/s/${shareId}/chat/${conversation.id}`);
    });
  };

  return (
    <div className="flex justify-center items-center h-screen p-4">
      <div className="max-w-3xl w-full">
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
