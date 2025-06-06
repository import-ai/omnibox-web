import Badge from '@/components/badge';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, FileText, Folder } from 'lucide-react';
import { IResTypeContext } from '@/page/chat/chat-input/types';

interface IProps {
  value: IResTypeContext[];
  onChange: (value: IResTypeContext[]) => void;
}

export default function ChatContext(props: IProps) {
  const { value, onChange } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (value.length <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 pt-2 mt-[-8px] max-w-3xl overflow-x-auto no-scrollbar">
      {value.map((item) => (
        <Badge
          key={item.resource.id}
          slot={
            <Button
              size="icon"
              className="w-4 h-4 bg-black text-white rounded-full dark:bg-white dark:text-black"
              onClick={() => {
                onChange(
                  value.filter(
                    (target) => target.resource.id !== item.resource.id,
                  ),
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
              navigate(`/${item.resource.namespace.id}/${item.resource.id}`);
            }}
          >
            {item.type === 'folder' ? (
              <Folder className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
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
