import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useEffect, useState } from 'react';
import { getNamespace } from '@/lib/namespace';
import { File, Folder, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBaseResponse {
  response_type: 'delta' | 'citation' | 'citation_list' | 'done';
}

interface ChatDeltaResponse extends ChatBaseResponse {
  response_type: 'delta';
  delta: string;
}

interface ChatDoneResponse extends ChatBaseResponse {
  response_type: 'done';
}

interface Citation {
  title: string;
  snippet: string;
  link: string;
}

interface ChatCitationListResponse extends ChatBaseResponse {
  response_type: 'citation_list';
  citation_list: Citation[];
}

export default function Chat() {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, onLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [data, onData] = useState<Array<{ type: string; resource: Resource }>>(
    [],
  );

  const namespace = getNamespace();
  const namespaceId = namespace.id;
  const token = localStorage.getItem('token') || '';

  const handleSend = async () => {
    const val = input.trim();
    if (val.length <= 0) {
      return;
    }
    onLoading(true);

    let localMessages: Message[] = [
      ...messages,
      { role: 'user', content: input },
    ];

    setMessages(localMessages);
    setInput('');

    const parents = data
      .filter((rc) => rc.type === 'parent')
      .map((rc) => rc.resource);
    const resources = data
      .filter((rc) => rc.type === 'resource')
      .map((rc) => rc.resource);
    const condition = {
      parentIds: parents.length > 0 ? parents.map((r) => r.id) : null,
      resourceIds: resources.length > 0 ? resources.map((r) => r.id) : null,
    };
    const body = {
      session_id: 'fake_id',
      query: localMessages[localMessages.length - 1].content,
      namespace_id: namespaceId,
      parent_ids: condition.parentIds,
      resource_ids: condition.resourceIds,
    };

    const response = await fetch('/api/v1/wizard/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error(t('not_support_readablestream'));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let firstToken = true;
    let responseText = '';
    let citationList: Citation[] = [];

    let loopFlag = true;

    let buffer: string = '';
    let i: number = 0;

    while (loopFlag) {
      const { done, value } = await reader.read();
      if (done) break;

      let sseResponse = decoder.decode(value);
      buffer += sseResponse;

      const chunks = buffer.split('\n\n');

      while (i < chunks.length - 1) {
        let chunk = '';
        for (const line of chunks[i].split('\n')) {
          if (line.startsWith('data:')) {
            chunk = line;
            break;
          }
        }
        if (chunk.startsWith('data:')) {
          const output = chunk.slice(5).trim();
          let chatResponse:
            | ChatDeltaResponse
            | ChatCitationListResponse
            | ChatDoneResponse = JSON.parse(output);
          if (chatResponse.response_type === 'done') {
            loopFlag = false;
            break;
          } else if (chatResponse.response_type === 'delta') {
            responseText += chatResponse.delta;
            for (let i = 0; i < citationList.length; i++) {
              responseText = responseText.replace(
                `<cite:${i + 1}>`,
                `[[${i + 1}]](/${citationList[i].link})`,
              );
            }
            localMessages = [
              ...(firstToken ? localMessages : localMessages.slice(0, -1)),
              {
                role: 'assistant',
                content: responseText,
              },
            ];
            setMessages(localMessages);
            if (firstToken) {
              firstToken = false;
            }
            /*
              if (!isStreaming) {
                break;
              }
               */
          } else if (chatResponse.response_type === 'citation_list') {
            citationList = chatResponse.citation_list;
          } else {
            console.error('Unknown response type', chatResponse);
          }
        }
        i++;
      }
    }
    onLoading(false);
  };

  useEffect(() => {
    return app.on(
      'context',
      (resource: Resource, type: 'resource' | 'parent') => {
        const target = data.find(
          (item) => item.resource.id === resource.id && item.type === type,
        );
        if (target) {
          return;
        }
        onData([...data, { type, resource }]);
      },
    );
  }, [data]);

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-2 rounded ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white dark:bg-blue-700'
                  : 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white'
              }`}
            >
              <Markdown content={message.content} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap">
        {data.map(({ type, resource }) => (
          <div
            key={`${type}_${resource.id}`}
            className={`flex items-center text-black dark:text-white rounded-full px-2 mr-2 h-6 ${
              type === 'parent'
                ? 'bg-green-200 dark:bg-green-500'
                : 'bg-blue-200 dark:bg-blue-500'
            }`}
          >
            <div className="mr-2 flex items-center text-sm">
              {type === 'parent' ? (
                <Folder className="w-4 h-4" />
              ) : (
                <File className="w-4 h-4" />
              )}
              <div
                className="ml-1 cursor-pointer"
                onClick={() => navigate(`/${resource.id}`)}
              >
                {resource.name || t('untitled')}
              </div>
            </div>
            <button
              className="focus:outline-none"
              onClick={() => {
                onData(data.filter((item) => item.resource.id !== resource.id));
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {data.length > 1 && (
          <Button onClick={() => onData([])} className="rounded-full px-2 h-6">
            {t('clear_all')}
          </Button>
        )}
      </div>
      <div className="items-center mt-4 border-2 rounded-3xl border-gray-200 dark:border-gray-700">
        <div className="relative flex flex-col">
          <Textarea
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full resize-none border-none rounded-t-3xl"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.metaKey || e.ctrlKey) {
                  e.preventDefault();
                  handleSend();
                }
              }
            }}
          />
          <div className="flex justify-end mb-1 mr-1">
            {loading ? (
              <Button className="rounded-full" onClick={() => onLoading(false)}>
                {t('stop')}
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                className="rounded-full"
                disabled={input.length === 0}
              >
                {t('send')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
