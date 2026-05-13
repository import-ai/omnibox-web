import { Check, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface IProps {
  resourceId: string;
  teamRootId: string;
  onSearch: (search: string) => void;
  onChange: (val: string, key?: string) => void;
}

export function ChooseWrapper(props: IProps) {
  const { teamRootId, onSearch, resourceId, onChange } = props;
  const { t } = useTranslation();
  const handleTeamClick = () => {
    onChange(teamRootId, 'resourceId');
    onSearch('');
  };

  if (!teamRootId) {
    return null;
  }

  return (
    <DropdownMenuItem
      onSelect={() => {
        handleTeamClick();
      }}
      className={cn(
        'cursor-pointer justify-between gap-1.5 rounded-lg py-2 hover:bg-gray-100 dark:text-white dark:hover:bg-neutral-900',
        {
          'bg-gray-100 dark:bg-neutral-900': teamRootId === resourceId,
        }
      )}
    >
      <div className="flex items-center gap-2">
        <Users className="size-4 text-neutral-500" />
        <span className="text-neutral-900 dark:text-white">
          {t('teamspace')}
        </span>
      </div>
      {teamRootId === resourceId && (
        <Check className="size-5 text-neutral-900" />
      )}
    </DropdownMenuItem>
  );
}
