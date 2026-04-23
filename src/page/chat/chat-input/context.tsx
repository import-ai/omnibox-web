import { Folder, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ResourceIcon from '@/assets/icons/resourceIcon';
import Badge from '@/components/badge';
import { Button } from '@/components/ui/button';

import { IResTypeContext } from './types';

interface IProps {
  value: IResTypeContext[];
  navigatePrefix: string;
  onChange: (value: IResTypeContext[]) => void;
}

export default function ChatContext(props: IProps) {
  const { value, navigatePrefix, onChange } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (value.length <= 0) {
    return null;
  }

  return (
    <div className="no-scrollbar mt-[-8px] flex max-w-3xl items-center gap-1 overflow-x-auto pt-2">
      {value.map(item => (
        <Badge
          key={`${item.resource.id}_${item.type}`}
          slot={
            <Button
              size="icon"
              className="size-4 rounded-full bg-black text-white dark:bg-white dark:text-black"
              onClick={() => {
                onChange(
                  value.filter(
                    target =>
                      !(
                        target.resource.id === item.resource.id &&
                        target.type === item.type
                      )
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
            className="dark:border-[#6e7276] dark:bg-transparent"
            onClick={() => {
              navigate(`${navigatePrefix}/${item.resource.id}`);
            }}
          >
            {item.type === 'folder' ? (
              <Folder className="size-4" />
            ) : (
              <ResourceIcon expand={false} resource={item.resource} />
            )}
            <span className="max-w-[130px] truncate">
              {item.resource.name || t('untitled')}
            </span>
          </Button>
        </Badge>
      ))}
    </div>
  );
}
