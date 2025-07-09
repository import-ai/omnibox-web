import { useMemo } from 'react';
import ChatInput from './input';
import ChatAction from './action';
import ChatTool from './chat-tool';
import ChatContext from './context';
import {
  ChatMode,
  ToolType,
  IResTypeContext,
  type ChatActionType,
} from '@/page/chat/chat-input/types';

interface IProps {
  value: string;
  mode: ChatMode;
  loading: boolean;
  tools: Array<ToolType>;
  thinking: boolean | '';
  context: IResTypeContext[];
  setMode: (mode: ChatMode) => void;
  onChange: (value: string) => void;
  onThink: (thinking: boolean | '') => void;
  onAction: (action?: ChatActionType) => void;
  onToolsChange: (tool: Array<ToolType>) => void;
  onContextChange: (context: IResTypeContext[]) => void;
}

export default function ChatArea(props: IProps) {
  const {
    mode,
    value,
    tools,
    setMode,
    context,
    loading,
    onAction,
    onChange,
    thinking,
    onThink,
    onToolsChange,
    onContextChange,
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
          tools={tools}
          onThink={onThink}
          context={context}
          thinking={thinking}
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
