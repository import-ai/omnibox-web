import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IProps {
  you?: boolean;
  email?: string;
  username?: string;
}

export default function UserCard(props: IProps) {
  const { you, email, username } = props;
  const { t } = useTranslation();

  if (!email && !username) {
    return null;
  }

  return (
    <div className="max-w-[180px]">
      {username && (
        <div className="flex min-w-0 items-center">
          <span
            className={cn('truncate', {
              'font-medium': !!email,
              'text-sm': !email,
            })}
          >
            {username}
          </span>
          {you && (
            <span className="ml-2 flex-shrink-0 text-muted-foreground">
              ({t('permission.you')})
            </span>
          )}
        </div>
      )}
      {email && (
        <div className="truncate text-sm text-muted-foreground">{email}</div>
      )}
    </div>
  );
}
