import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useQuota from '@/hooks/useQuota';
import { QuotaDisplay } from '@/page/settings/tabs/quota';
import { formatCreditAmount } from '@/page/settings/tabs/quota/utils';

interface AgentCreditsIndicatorProps {
  namespaceId: string;
  isGenerating?: boolean;
}

export const AGENT_CREDITS_REFRESH_INTERVAL_MS = 2000;

export default function AgentCreditsIndicator({
  namespaceId,
  isGenerating = false,
}: AgentCreditsIndicatorProps) {
  const { t } = useTranslation();
  const { data, refresh } = useQuota(namespaceId);
  const [usageOpen, setUsageOpen] = useState(false);
  const wasGeneratingRef = useRef(isGenerating);

  useEffect(() => {
    if (isGenerating) {
      wasGeneratingRef.current = true;
      const timer = window.setInterval(() => {
        void refresh();
      }, AGENT_CREDITS_REFRESH_INTERVAL_MS);
      return () => window.clearInterval(timer);
    }
    if (wasGeneratingRef.current) {
      wasGeneratingRef.current = false;
      void refresh({ force: true });
    }
  }, [isGenerating, refresh]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) void refresh({ force: true });
    },
    [refresh]
  );

  if (!data) return null;

  const { self, other_users: otherUsers, total } = data.agent_credits;
  const used = self + otherUsers;
  const percent =
    total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const usageLabel = `${formatCreditAmount(used)} / ${formatCreditAmount(total)} ${t('quota.credit_unit')}`;

  return (
    <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
      <Tooltip delayDuration={150} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex size-8 cursor-pointer items-center justify-center text-muted-foreground"
            aria-label={usageLabel}
            onClick={() => setUsageOpen(true)}
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
          </button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[calc(100vw-2rem)] whitespace-nowrap text-center"
          side="top"
        >
          {usageLabel}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-7">
            {t('namespace.usage')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('quota.description')}
          </DialogDescription>
        </DialogHeader>
        <QuotaDisplay namespaceId={namespaceId} data={data} />
      </DialogContent>
    </Dialog>
  );
}
