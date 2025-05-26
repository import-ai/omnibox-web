import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { File, Folder, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/markdown';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/request';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

interface ChatBaseResponse {
  response_type:
    | 'delta'
    | 'think_delta'
    | 'citations'
    | 'done'
    | 'tool_call'
    | 'end_of_message'
    | 'error';
}

interface ErrorResponse extends ChatBaseResponse {
  response_type: 'error';
  message: string;
}

interface ChatDeltaResponse extends ChatBaseResponse {
  response_type: 'delta';
  delta: string;
}

interface ChatThinkDeltaResponse extends ChatBaseResponse {
  response_type: 'think_delta';
  delta: string;
}

interface Function {
  name: string;
  arguments: Record<string, any>;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: Function;
}

interface TollCallResponse extends ChatBaseResponse {
  response_type: 'tool_call';
  tool_call: ToolCall;
}

interface ChatDoneResponse extends ChatBaseResponse {
  response_type: 'done';
}

interface Citation {
  title: string;
  snippet: string;
  link: string;
}

interface ChatCitationsResponse extends ChatBaseResponse {
  response_type: 'citations';
  citations: Citation[];
}

interface EndOfMessage extends ChatBaseResponse {
  response_type: 'end_of_message';
  role: 'user' | 'assistant' | 'tool_call';
  messageId: string;
}

export default function Page() {
  const app = useApp();
  const params = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, onLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const namespace_id = params.namespace_id || '';
  const token = localStorage.getItem('token') || '';
  const [data, onData] = useState<Array<{ type: string; resource: Resource }>>(
    [],
  );

  const stream = async (
    url: string,
    body: Record<string, any>,
    callback: (data: string) => Promise<void>,
  ): Promise<void> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch from wizard');
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    const decoder = new TextDecoder();
    let buffer: string = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd == -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            await callback(data);
          }
        }
      }
    } finally {
      await reader.cancel();
    }
  };

  const getConversationId = async () => {
    if (!conversationId) {
      const url = `/namespaces/${namespace_id}/conversations`;
      const response: { id: string } = await http.post(url);
      setConversationId(response.id);
      return response.id;
    }
    return conversationId;
  };

  const getLocalMessages = () => {
    const val = input.trim();
    if (val.length <= 0) {
      return [];
    }
    onLoading(true);

    let localMessages: Message[] = [
      ...messages,
      { role: 'user', content: input },
    ];

    setMessages(localMessages);
    setInput('');
    return localMessages;
  };

  const getCondition = () => {
    const parents = data
      .filter((rc) => rc.type === 'parent')
      .map((rc) => rc.resource);
    const resources = data
      .filter((rc) => rc.type === 'resource')
      .map((rc) => rc.resource);
    return {
      parentIds: parents.length > 0 ? parents.map((r) => r.id) : undefined,
      resourceIds:
        resources.length > 0 ? resources.map((r) => r.id) : undefined,
    };
  };

  function cleanCitePrefix(text: string) {
    const citePrefix = '<cite:';
    const citePrefixRegex = /<cite:\d+$/g;
    for (let i = 0; i < citePrefix.length; i++) {
      const suffix = citePrefix.slice(0, i + 1);
      if (text.endsWith(suffix)) {
        return text.replace(suffix, '');
      }
    }
    if (citePrefixRegex.test(text)) {
      return text.replace(citePrefixRegex, '');
    }

    return text;
  }

  const parseCitations = (content: string, citations: Citation[]) => {
    content = cleanCitePrefix(content);
    for (let i = 0; i < citations.length; i++) {
      content = content.replace(
        new RegExp(`<cite:${i + 1}>`, 'g'),
        `[[${i + 1}]](${citations[i].link})`,
      );
    }
    return content.trim();
  };

  const handleSendV2 = async () => {
    let parentMessageId: string | undefined = undefined;
    if (messages.length > 0) {
      parentMessageId = messages[messages.length - 1].id;
    }

    let localMessages = getLocalMessages();
    if (!localMessages) {
      return;
    }

    const { parentIds, resourceIds } = getCondition();

    const conversation_id: string = await getConversationId();

    const body = {
      conversation_id,
      query: localMessages[localMessages.length - 1].content,
      tools: [
        {
          name: 'knowledge_search',
          namespace_id,
          parent_ids: parentIds,
          resource_ids: resourceIds,
        },
        {
          name: 'web_search',
        },
      ],
      parent_message_id: parentMessageId,
      enable_thinking: true,
    };

    let context: {
      create: boolean;
      think: string;
      response: string;
      citations: Citation[];
    } = { create: true, think: '', response: '', citations: [] };

    const updateMessages = () => {
      const think = parseCitations(context.think, context.citations);
      const response = parseCitations(context.response, context.citations);

      let content: string = '';
      for (const line of think.split('\n')) {
        content += '> ' + line + '\n';
      }
      content += '\n';
      content += response;

      localMessages = [
        ...(context.create ? localMessages : localMessages.slice(0, -1)),
        {
          role: 'assistant',
          content,
        },
      ];
      setMessages(localMessages);

      if (context.create) {
        context.create = false;
      }
    };

    await stream('/api/v1/wizard/ask', body, async (data) => {
      let chatResponse:
        | ChatDeltaResponse
        | ChatCitationsResponse
        | ChatDoneResponse
        | TollCallResponse
        | ChatThinkDeltaResponse
        | EndOfMessage
        | ErrorResponse = JSON.parse(data);

      if (chatResponse.response_type === 'delta') {
        context.response += chatResponse.delta;
        updateMessages();
      } else if (chatResponse.response_type === 'think_delta') {
        context.think += chatResponse.delta;
        updateMessages();
      } else if (chatResponse.response_type === 'tool_call') {
        localMessages = [
          ...localMessages,
          {
            role: 'tool',
            content: `Call [\`${chatResponse.tool_call.function.name}\`] with arguments:\n\`${JSON.stringify(chatResponse.tool_call.function.arguments)}\``,
          },
        ];
        setMessages(localMessages);
        context.create = true;
        context.think = '';
        context.response = '';
      } else if (chatResponse.response_type === 'citations') {
        context.citations.push(...chatResponse.citations);
      } else if (chatResponse.response_type === 'error') {
        console.error({ message: chatResponse.message });
      } else if (chatResponse.response_type === 'done') {
      } else if (chatResponse.response_type === 'end_of_message') {
        const lastMessage = localMessages[localMessages.length - 1];
        if (lastMessage.role === chatResponse.role) {
          lastMessage.id = chatResponse.messageId;
          setMessages(localMessages);
        } else {
          console.error({
            message: 'Message role mismatch',
            lastMessageRole: lastMessage.role,
            targetMessageRole: chatResponse.role,
          });
        }
      } else {
        console.error({ message: 'Unknown response type', chatResponse });
      }
    });

    onLoading(false);
  };

  useEffect(() => {
    return app.on('context_clear', () => {
      onData([]);
    });
  }, []);

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
              {message.role !== 'user' ? (
                <Markdown content={message.content} />
              ) : (
                <a>{message.content}</a>
              )}
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
                onClick={() => navigate(`/${namespace_id}/${resource.id}`)}
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
                  handleSendV2().then();
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
                onClick={handleSendV2}
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
