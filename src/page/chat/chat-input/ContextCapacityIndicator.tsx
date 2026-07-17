import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { getLatestContextCompactCapacity } from '@/page/chat/messages/role/assistantMessageUtils';

interface ContextCapacityIndicatorProps {
  capacity: NonNullable<ReturnType<typeof getLatestContextCompactCapacity>>;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}k`;
  return String(tokens);
}

export default function ContextCapacityIndicator({
  capacity,
}: ContextCapacityIndicatorProps) {
  const { t } = useTranslation();
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - capacity.percent / 100);
  const remainingPercent = 100 - capacity.percent;
  const usageLabel = t('chat.messages.context_capacity.ratio', {
    used: capacity.percent,
    remaining: remainingPercent,
  });

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          className="flex size-8 cursor-help items-center justify-center text-muted-foreground"
          aria-label={usageLabel}
        >
          <svg
            aria-hidden="true"
            className="size-4 -rotate-90"
            viewBox="0 0 20 20"
          >
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent
        className="max-w-[calc(100vw-2rem)] whitespace-nowrap text-center"
        side="top"
      >
        <div>{usageLabel}</div>
        <div>
          {t('chat.messages.context_capacity.tokens', {
            estimated: formatTokenCount(capacity.estimatedTokens),
            trigger: formatTokenCount(capacity.triggerTokens),
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
