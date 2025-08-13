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
    <div>
      {username && (
        <div className="flex items-center">
          <span className={cn({ 'font-medium': !!email, 'text-sm': !email })}>
            {username}
          </span>
          {you && (
            <span className="text-muted-foreground ml-2">
              ({t('permission.you')})
            </span>
          )}
        </div>
      )}
      {email && <div className="text-muted-foreground text-sm">{email}</div>}
    </div>
  );

  // return (
  //   <div className="flex items-center gap-3">
  //     <Avatar className="h-10 w-10 rounded-full">
  //       <AvatarImage src="/placeholder.svg" />
  //       <AvatarFallback className="bg-gray-200">
  //         {username?.substring(0, 2)}
  //       </AvatarFallback>
  //     </Avatar>
  //     <div>
  //       <div className="flex items-center">
  //         <span className="font-medium">{username}</span>
  //         {you && <span className="text-gray-500 ml-2">({t('permission.you')})</span>}
  //       </div>
  //       <div className="text-gray-500 text-sm">{email}</div>
  //     </div>
  //   </div>
  // );
}
