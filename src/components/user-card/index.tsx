import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { cn } from '@/lib/utils';

interface IProps {
  you?: boolean;
  email?: string;
  username?: string;
  nickname?: string | null;
  note?: string | null;
}

export default function UserCard(props: IProps) {
  const { you, email, username, nickname, note } = props;
  const { t } = useTranslation();
  const trimmedNickname = nickname?.trim() || '';
  const showUsernameInParens = Boolean(
    trimmedNickname && username && trimmedNickname !== username
  );
  const primaryName = showUsernameInParens
    ? trimmedNickname
    : trimmedNickname || username;
  const subtitle = note || email || '';

  if (!primaryName && !subtitle) {
    return null;
  }

  const tooltipRows = [
    username ? { label: t('form.username'), value: username } : null,
    email ? { label: t('form.email'), value: email } : null,
    trimmedNickname && trimmedNickname !== username
      ? { label: t('manage.nickname'), value: trimmedNickname }
      : null,
    note ? { label: t('manage.note'), value: note } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  const identity = (
    <div className="max-w-[180px]">
      {primaryName && (
        <div className="flex min-w-0 items-center">
          <span
            className={cn('truncate', {
              'font-medium': !!subtitle,
              'text-sm': !subtitle,
            })}
          >
            {showUsernameInParens ? (
              <>
                {trimmedNickname}
                <span className="text-muted-foreground">（{username}）</span>
              </>
            ) : (
              primaryName
            )}
          </span>
          {you && (
            <span className="ml-2 flex-shrink-0 text-muted-foreground">
              {t('permission.you')}
            </span>
          )}
        </div>
      )}
      {subtitle && (
        <div className="truncate text-sm text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );

  if (!tooltipRows.length) {
    return identity;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="min-w-0 cursor-pointer">{identity}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="space-y-1.5 text-left">
          {tooltipRows.map(row => (
            <div key={row.label}>
              <div className="text-primary-foreground/70">{row.label}</div>
              <div>{row.value}</div>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
