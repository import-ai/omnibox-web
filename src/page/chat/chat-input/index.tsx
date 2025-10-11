import { useMemo } from 'react';

import {
  type ChatActionType,
  ChatMode,
  IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';

import ChatAction from './action';
import ChatTool from './chat-tool';
import ChatContext from './context';
import ChatInput from './input';

interface IProps {
  value: string;
  mode: ChatMode;
  loading: boolean;
  tools: Array<ToolType>;
  context: IResTypeContext[];
  navigatePrefix: string;
  setMode: (mode: ChatMode) => void;
  onChange: (value: string) => void;
  onAction: (action?: ChatActionType) => void;
  onToolsChange: (tool: Array<ToolType>) => void;
  onContextChange: (context: IResTypeContext[]) => void;
}

export default function ChatArea(props: IProps) {
  const {
    value,
    mode,
    loading,
    tools,
    context,
    navigatePrefix,
    setMode,
    onChange,
    onAction,
    onToolsChange,
    onContextChange,
  } = props;

  const disabled = useMemo(() => {
    return !value || value.trim().length === 0;
  }, [value]);

  return (
    <div className="max-w-[766px] w-full mx-auto rounded-[12px] p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-none">
      <ChatContext
        value={context}
        onChange={onContextChange}
        navigatePrefix={navigatePrefix}
      />
      <ChatInput value={value} onChange={onChange} onAction={onAction} />
      <div className="flex items-center justify-between">
        <ChatTool
          tools={tools}
          context={context}
          onToolsChange={onToolsChange}
        />
        <ChatAction
          onAction={onAction}
          disabled={disabled}
          loading={loading}
          mode={mode}
          setMode={setMode}
        />
      </div>
    </div>
  );
}
