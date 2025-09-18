import { Folder, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Badge from '@/components/badge';
import { Button } from '@/components/ui/button';
import ResourceIcon from '@/page/sidebar/content/resourceIcon';
import { PrivateSearchResource } from '@/page/chat/conversation/types';

interface IProps {
  value: PrivateSearchResource[];
  navigatePrefix: string;
  onChange: (value: PrivateSearchResource[]) => void;
}

export default function ChatContext(props: IProps) {
  const { value, navigatePrefix, onChange } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (value.length <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 pt-2 mt-[-8px] max-w-3xl overflow-x-auto no-scrollbar">
      {value.map(item => (
        <Badge
          key={`${item.id}_${item.type}`}
          slot={
            <Button
              size="icon"
              className="w-4 h-4 bg-black text-white rounded-full dark:bg-white dark:text-black"
              onClick={() => {
                onChange(
                  value.filter(
                    target =>
                      !(target.id === item.id && target.type === item.type)
                  )
                );
              }}
            >
              <X />
            </Button>
          }
        >
          <Button
            size="sm"
            variant="outline"
            className="dark:bg-transparent dark:border-[#6e7276]"
            onClick={() => {
              navigate(`${navigatePrefix}/${item.id}`);
            }}
          >
            {item.type === 'folder' ? (
              <Folder className="w-4 h-4" />
            ) : (
              <ResourceIcon expand={false} resource={item.resource} />
            )}
            <span className="max-w-[130px] truncate">
              {item.name || t('untitled')}
            </span>
          </Button>
        </Badge>
      ))}
    </div>
  );
}
