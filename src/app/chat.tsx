import * as React from 'react';
import {SidebarInset, SidebarTrigger} from "@/components/ui/sidebar";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Separator} from "@/components/ui/separator";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage} from "@/components/ui/breadcrumb";
import {NavChatActions} from "@/components/nav-chat-actions";
import {Markdown} from "@/components/markdown";
import {Link, useParams} from "react-router";
import {useGlobalContext} from "@/components/provider/global-context-provider";
import {File, Folder, X} from "lucide-react";

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatBaseResponse = {
  response_type: "delta" | "citation" | "citation_list" | "done";
};

type ChatDeltaResponse = ChatBaseResponse & {
  response_type: "delta";
  delta: string;
};

type ChatDoneResponse = ChatBaseResponse & {
  response_type: "done";
}

type Citation = {
  title: string
  snippet: string
  link: string
};

type ChatCitationListResponse = ChatBaseResponse & {
  response_type: "citation_list";
  citation_list: Citation[];
};


export function Chat() {
  const {namespace} = useParams();
  const {resourcesCondition, setResourcesCondition} = useGlobalContext().resourcesConditionState;
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState<string>("");
  const [isStreaming, setIsStreaming] = React.useState<boolean>(false);

  const condition = React.useMemo(() => {
    const parents = resourcesCondition.filter(rc => rc.type === "parent").map(rc => rc.resource);
    const resources = resourcesCondition.filter(rc => rc.type === "resource").map(rc => rc.resource);

    return {
      parentIds: parents.length > 0 ? parents.map(r => r.id) : null,
      resourceIds: resources.length > 0 ? resources.map(r => r.id) : null
    };
  }, [resourcesCondition]);

  const handleSend = async () => {
    if (input.trim() && namespace) {
      setIsStreaming(true);

      let localMessages: Message[] = [...messages, {role: 'user', content: input}];

      setMessages(localMessages);
      setInput("");

      const body = {
        session_id: "fake_id",
        query: localMessages[localMessages.length - 1].content,
        namespace: namespace,
        parent_ids: condition.parentIds,
        resource_ids: condition.resourceIds
      };

      const response = await fetch('/api/v1/wizard/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not yet supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstToken: boolean = true;
      let responseText: string = "";
      let citationList: Citation[] = [];

      let loopFlag: boolean = true;

      while (loopFlag) {
        const {done, value} = await reader.read();
        if (done) break;

        const sseResponse = decoder.decode(value);

        const chunks = sseResponse.split('\n\n');

        for (const chunk of chunks) {
          if (chunk.startsWith('data:')) {
            const output = chunk.slice(5).trim();
            let chatResponse: ChatDeltaResponse | ChatCitationListResponse | ChatDoneResponse = {} as any;
            chatResponse = JSON.parse(output);
            if (chatResponse.response_type === "done") {
              loopFlag = false;
              break
            } else if (chatResponse.response_type === "delta") {
              responseText += chatResponse.delta;
              for (let i = 0; i < citationList.length; i++) {
                responseText = responseText.replace(`<cite:${i + 1}>`, `[[${i + 1}]](#/${namespace}/${citationList[i].link})`);
              }
              localMessages = [...(firstToken ? localMessages : localMessages.slice(0, -1)), {
                role: 'assistant',
                content: responseText
              }];
              setMessages(localMessages);
              if (firstToken) {
                firstToken = false;
              }
              /*
              if (!isStreaming) {
                break;
              }
               */
            } else if (chatResponse.response_type === "citation_list") {
              citationList = chatResponse.citation_list;
            } else {
              console.error("Unknown response type", chatResponse);
            }
          }
        }
      }

      setIsStreaming(false);
    }
  };

  const removeTag = (index: number) => {
    setResourcesCondition((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SidebarInset>
      <header className="flex h-14 shrink-0 items-center gap-2">
        <div className="flex flex-1 items-center gap-2 px-3">
          <SidebarTrigger/>
          <Separator orientation="vertical" className="mr-2 h-4"/>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  Foo
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto px-3">
          <NavChatActions/>
        </div>
      </header>
      <div className="flex justify-center h-full p-4">
        <div className="flex flex-col h-full max-w-3xl w-full">
          <div className="flex-1 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block p-2 rounded ${
                    message.role === 'user' ?
                      'bg-blue-500 text-white dark:bg-blue-700' :
                      'bg-gray-200 text-black dark:bg-gray-700 dark:text-white'}`}>
                  <Markdown content={message.content}/>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap">
            {
              resourcesCondition.map((rc, index) => (
                <div key={index}
                     className={`flex items-center text-black dark:text-white rounded-full px-2 mr-2 h-6 ${
                       rc.type === "parent" ? 'bg-green-200 dark:bg-green-500' : 'bg-blue-200 dark:bg-blue-500'
                     }`}>
                  <div className="mr-2 flex items-center text-sm">
                    {rc.type === "parent" ? <Folder className="w-4 h-4"/> : <File className="w-4 h-4"/>}
                    <Link className="ml-1" to={rc.resource.id}>{rc.resource.name ?? "Untitled"}</Link>
                  </div>
                  <button onClick={() => removeTag(index)} className="focus:outline-none">
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              ))
            }
            {
              resourcesCondition.length > 1 &&
              <Button onClick={() => setResourcesCondition([])} className="rounded-full px-2 h-6">
                Clear All
              </Button>
            }
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
                      handleSend().then();
                    }
                  }
                }}
              />
              <div className="flex justify-end mb-1 mr-1">
                {isStreaming ?
                  <Button onClick={() => setIsStreaming(false)} className="rounded-full">Stop</Button> :
                  <Button onClick={handleSend} className="rounded-full" disabled={input.length === 0}>Send</Button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
