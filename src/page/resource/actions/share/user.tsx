import Action from './action';
import useUser from '@/hooks/use-user';
// import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UserForm() {
  // const { t } = useTranslation();
  const { uid, user } = useUser();

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center p-2 -m-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-full">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-gray-200">
              {user.username.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <span className="font-medium">{user.username}</span>
              {user.id === uid && (
                <span className="text-gray-500 ml-2">(你)</span>
              )}
            </div>
            <div className="text-gray-500 text-sm">{user.email}</div>
          </div>
        </div>
        {user.id && <Action />}
      </div>
    </div>
  );
}
