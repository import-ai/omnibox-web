import { useMemo } from 'react';

import {
  type ChatActionType,
  ChatMode,
  InputMode,
  IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';
import { DecisionType } from '@/page/chat/conversation/types.ts';

import ChatAction from './action';
import ChatTool from './chat-tool';
import ChatContext from './context';
import DecisionInput, { PendingInterrupt } from './decision-input';
import ChatInput from './input';

interface IProps {
  value: string;
  mode: ChatMode;
  loading: boolean;
  tools: Array<ToolType>;
  context: IResTypeContext[];
  navigatePrefix: string;
  inputMode: InputMode;
  pendingInterrupts: PendingInterrupt[];
  setMode: (mode: ChatMode) => void;
  onChange: (value: string) => void;
  onAction: (action?: ChatActionType) => void;
  onToolsChange: (tool: Array<ToolType>) => void;
  onContextChange: (context: IResTypeContext[]) => void;
  onDecision: (decisions: { type: DecisionType }[]) => void;
}

export default function ChatArea(props: IProps) {
  const {
    value,
    mode,
    loading,
    tools,
    context,
    navigatePrefix,
    inputMode,
    pendingInterrupts,
    setMode,
    onChange,
    onAction,
    onToolsChange,
    onContextChange,
    onDecision,
  } = props;

  const disabled = useMemo(() => {
    return (
      inputMode === InputMode.TEXT && (!value || value.trim().length === 0)
    );
  }, [value, inputMode]);

  const isDecisionMode = inputMode === InputMode.DECISION;

  return isDecisionMode && pendingInterrupts.length > 0 ? (
    <DecisionInput
      interrupts={pendingInterrupts}
      onDecision={onDecision}
      disabled={loading}
    />
  ) : (
    <div className="max-w-[766px] w-full mx-auto rounded-[12px] p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-[#303030]">
      <ChatContext
        value={context}
        onChange={onContextChange}
        navigatePrefix={navigatePrefix}
      />
      <ChatInput
        value={value}
        onChange={onChange}
        onAction={onAction}
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        <ChatTool
          tools={tools}
          context={context}
          onToolsChange={onToolsChange}
          disabled={isDecisionMode}
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
