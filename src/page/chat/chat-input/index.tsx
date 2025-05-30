import ChatTool from './tool';
import Context from './context';
import ChatInput from './input';
import ChatAction from './action';
import { Resource } from '@/interface';

interface IProps {
  value: string;
  onChange: (value: string) => void;
  tools: Array<string>;
  onAction: (action?: 'stop' | 'disabled') => void;
  onToolsChange: (tool: Array<string>) => void;
  context: Array<{ type: string; resource: Resource }>;
  onContextChange: (
    context: Array<{ type: string; resource: Resource }>,
  ) => void;
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
      <Context value={context} onChange={onContextChange} />
      <ChatInput value={value} onChange={onChange} onAction={onAction} />
      <div className="flex items-center justify-between">
        <ChatTool tools={tools} onToolsChange={onToolsChange} />
        <ChatAction onAction={onAction} />
      </div>
    </div>
  );
}
