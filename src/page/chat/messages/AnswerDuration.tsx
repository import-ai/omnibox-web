import { Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { MessageDetail } from '../core/types/conversation';
import { formatAnswerDuration, getAnswerTiming } from './answerTiming';

export function AnswerDuration({ message }: { message: MessageDetail }) {
  const { t } = useTranslation();
  const timing = getAnswerTiming(message);
  if (!timing) return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
      <Timer className="size-4" aria-hidden="true" />
      <span>
        {t(`chat.messages.answer_duration.${timing.outcome}`, {
          duration: formatAnswerDuration(timing.duration_ms!, t),
        })}
      </span>
    </div>
  );
}
