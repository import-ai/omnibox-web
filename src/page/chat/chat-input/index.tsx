import ChatTool from './chat-tool';
import ChatContext from './context';
import ChatInput from './input';
import ChatAction from './action';
import { IResTypeContext } from '@/page/chat/useContext.ts';
import { ToolType } from '@/page/chat/chat-input/types';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  onAction: (action?: 'stop' | 'disabled') => void;
  tools: Array<ToolType>;
  onToolsChange: (tool: Array<ToolType>) => void;
  context: IResTypeContext[];
  onContextChange: (context: IResTypeContext[]) => void;
}

export default function ChatArea(props: IProps) {
  const {
    value,
    tools,
    context,
    onAction,
    onChange,
    onToolsChange,
    onContextChange,
  } = props;

  return (
    <div className="rounded-[12px] px-4 pt-3 pb-2 border border-solid border-[#EDEFF6] bg-[linear-gradient(152deg,_#F7F8FA,_#fff)]">
      <ChatContext value={context} onChange={onContextChange} />
      <ChatInput value={value} onChange={onChange} onAction={onAction} />
      <div className="flex items-center justify-between">
        <ChatTool tools={tools} onToolsChange={onToolsChange} />
        <ChatAction onAction={onAction} disabled={false} />
      </div>
    </div>
  );
}
