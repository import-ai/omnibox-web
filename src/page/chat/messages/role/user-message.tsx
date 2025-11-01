import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

import Copy from '@/components/copy';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import { MessageDetail } from '@/page/chat/types/conversation';

interface IProps {
  message: MessageDetail;
  messageOperator: MessageOperator;
}

export function UserMessage(props: IProps) {
  const { message, messageOperator } = props;
  const openAIMessage = message.message;
  const lines = openAIMessage.content?.split('\n') || [];

  const siblings = useMemo(() => {
    return messageOperator.getSiblings(message.id);
  }, [messageOperator, message.id]);

  const currentIndex = siblings.indexOf(message.id);
  const hasSiblings = siblings.length > 1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      messageOperator.activate(siblings[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < siblings.length - 1) {
      messageOperator.activate(siblings[currentIndex + 1]);
    }
  };

  return (
    <div className="group flex flex-col items-end">
      <div
        className={cn(
          'flex w-fit sm:max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
          'ml-auto bg-secondary text-secondary-foreground dark:bg-[#303030]'
        )}
      >
        {lines.map((line, idx) => (
          <span key={idx} className="break-words">
            {line}
            {idx !== lines.length - 1 && <br />}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 group-hover:opacity-100 opacity-0">
        {hasSiblings && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="p-0 w-7 h-7"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
              {currentIndex + 1}/{siblings.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="p-0 w-7 h-7"
              onClick={handleNext}
              disabled={currentIndex === siblings.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
        <Copy content={openAIMessage.content || ''} />
      </div>
    </div>
  );
}
