import ChatTool from './chat-tool';
import ChatContext from './context';
import ChatInput from './input';
import ChatAction from './action';
import {
  type ChatActionType,
  ChatMode,
  IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';
import { useMemo } from 'react';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  onAction: (action?: ChatActionType) => void;
  tools: Array<ToolType>;
  loading: boolean;
  onToolsChange: (tool: Array<ToolType>) => void;
  context: IResTypeContext[];
  onContextChange: (context: IResTypeContext[]) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export default function ChatArea(props: IProps) {
  const {
    value,
    tools,
    context,
    onAction,
    onChange,
    loading,
    onToolsChange,
    onContextChange,
    mode,
    setMode,
  } = props;

  const disabled = useMemo(() => {
    return !value || value.trim().length === 0;
  }, [value]);

  return (
    <div className="rounded-[12px] p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-none">
      <ChatContext value={context} onChange={onContextChange} />
      <ChatInput value={value} onChange={onChange} onAction={onAction} />
      <div className="flex items-center justify-between">
        <ChatTool
          context={context}
          tools={tools}
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
