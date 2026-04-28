import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Copy from '@/components/copy';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { pathI18n, trimMiddle } from '@/lib/tool-args.ts';
import { cn } from '@/lib/utils';
import { MessageOperator } from '@/page/chat/core/message-operator.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';
import { useMessageSiblings } from '@/page/chat/core/use-message-siblings.ts';

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

  const selectedResources = message.attrs?.user_context?.selected_resources;

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
      {selectedResources && selectedResources.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-muted-foreground text-xs my-0.5 cursor-default">
              {t('chat.messages.user_context.selected_resources', {
                count: selectedResources.length,
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {selectedResources.slice(0, 3).map((path, idx) => (
              <p key={idx}>{trimMiddle(pathI18n(path, t))}</p> // TODO Scrollable
            ))}
            {selectedResources.length > 3 && <p>...</p>}
          </TooltipContent>
        </Tooltip>
      )}
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
