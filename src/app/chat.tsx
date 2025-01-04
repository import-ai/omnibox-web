import * as React from 'react';
import {SidebarInset, SidebarTrigger} from "@/components/ui/sidebar";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage} from "@/components/ui/breadcrumb.tsx";
import {NavChatActions} from "@/components/nav-chat-actions";
import {ArrowUp} from "lucide-react";
import {Markdown} from "@/components/markdown.tsx";

// Define the type for chat messages
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function Chat() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState<string>("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, {role: 'user', content: input}]);
      setInput("");
      // Simulate assistant response
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          {role: 'assistant', content: "This is an automated response."},
        ]);
      }, 1000);
    }
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
                  className={`inline-block p-2 rounded ${message.role === 'user' ? 'bg-blue-500 text-white dark:bg-blue-700' : 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white'}`}>
                  <Markdown content={message.content}/>
                </div>
              </div>
            ))}
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
                    e.preventDefault();
                    if (e.shiftKey) {
                      setInput(input + "\n");
                      const textarea = e.target as HTMLTextAreaElement;
                      textarea.scrollTop = textarea.scrollHeight;
                    } else {
                      handleSend();
                    }
                  }
                }}
              />
              <div className="flex justify-end mb-1 mr-1">
                <Button onClick={handleSend} className="rounded-full" disabled={input.length === 0}><ArrowUp/></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
