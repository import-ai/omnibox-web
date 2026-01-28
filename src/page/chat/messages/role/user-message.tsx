import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Copy from '@/components/copy';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import { useMessageSiblings } from '@/page/chat/messages/hooks/useMessageSiblings';
import { MessageDetail } from '@/page/chat/types/conversation';

interface IProps {
  message: MessageDetail;
  messageOperator: MessageOperator;
  onEdit: (messageId: string, newContent: string) => void;
}

export function UserMessage(props: IProps) {
  const { message, messageOperator, onEdit } = props;
  const { t } = useTranslation();
  const openAIMessage = message.message;
  const lines = openAIMessage.content?.split('\n') || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    openAIMessage.content || ''
  );

  const { siblings, currentIndex, hasSiblings, handlePrevious, handleNext } =
    useMessageSiblings(message.id, messageOperator);

  const handleEditClick = () => {
    setEditedContent(openAIMessage.content || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedContent.trim() && onEdit) {
      onEdit(message.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(openAIMessage.content || '');
    setIsEditing(false);
  };

  return (
    <div className="group flex flex-col items-end">
      <div
        className={cn(
          'flex w-fit sm:max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2',
          'ml-auto bg-secondary text-secondary-foreground dark:bg-[#303030]'
        )}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              className="min-h-[100px] resize-y"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                {t('chat.messages.actions.cancel_edit')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!editedContent.trim()}
              >
                {t('chat.messages.actions.save_edit')}
              </Button>
            </div>
          </div>
        ) : (
          lines.map((line, idx) => (
            <span key={idx} className="break-words">
              {line}
              {idx !== lines.length - 1 && <br />}
            </span>
          ))
        )}
      </div>
      <div className="flex items-center gap-1 transition-opacity duration-300 group-hover:duration-75 group-hover:opacity-100 opacity-0">
        {!isEditing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="p-0 w-7 h-7"
                onClick={handleEditClick}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('chat.messages.actions.edit')}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Copy
          content={openAIMessage.content || ''}
          tooltip={t('chat.messages.actions.copy_simple')}
        />
        {hasSiblings && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="p-0 w-4 h-7"
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
              className="p-0 w-4 h-7"
              onClick={handleNext}
              disabled={currentIndex === siblings.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
