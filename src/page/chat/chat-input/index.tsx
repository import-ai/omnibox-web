import { useCallback, useMemo, useState } from 'react';

import {
  ChatAreaCallbacks,
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
  mode: ChatMode;
  loading: boolean;
  tools: Array<ToolType>;
  context: IResTypeContext[];
  navigatePrefix: string;
  inputMode: InputMode;
  pendingInterrupts: PendingInterrupt[];
  setMode: (mode: ChatMode) => void;
  callbacks: ChatAreaCallbacks;
  onToolsChange: (tool: Array<ToolType>) => void;
  onContextChange: (context: IResTypeContext[]) => void;
  onDecision: (decisions: { type: DecisionType }[]) => void;
  value?: string;
  onChange?: (value: string) => void;
}

export default function ChatArea(props: IProps) {
  const {
    mode,
    loading,
    tools,
    context,
    navigatePrefix,
    inputMode,
    pendingInterrupts,
    setMode,
    callbacks,
    onToolsChange,
    onContextChange,
    onDecision,
    value: controlledValue,
    onChange: controlledOnChange,
  } = props;

  const [internalValue, setInternalValue] = useState('');
  const isControlled =
    controlledValue !== undefined && controlledOnChange !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const disabled = useMemo(() => {
    return (
      inputMode === InputMode.TEXT && (!value || value.trim().length === 0)
    );
  }, [value, inputMode]);

  const handleSetValue = useCallback(
    (newValue: string) => {
      if (isControlled) {
        controlledOnChange!(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [isControlled, controlledOnChange]
  );

  const handleSend = useCallback(() => {
    const v = value.trim();
    if (v) {
      onContextChange([]);
      callbacks.sendMessage(v);
      if (!isControlled) {
        setInternalValue('');
      }
    }
  }, [value, callbacks, onContextChange, isControlled]);

  const handleStop = useCallback(() => {
    callbacks.stopStreaming();
  }, [callbacks]);

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
        onChange={handleSetValue}
        onSend={handleSend}
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
          onSend={handleSend}
          onStop={handleStop}
          disabled={disabled}
          loading={loading}
          mode={mode}
          setMode={setMode}
        />
      </div>
    </div>
  );
}
