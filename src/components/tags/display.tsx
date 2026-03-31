import { ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Option } from '@/components/multiple-selector';
import Space from '@/components/space';
import { Badge } from '@/components/ui/badge';

interface IProps {
  data: Array<Option>;
  onEdit: () => void;
  readOnly?: boolean;
}

export function TagsDisplay(props: IProps) {
  const { data, onEdit, readOnly } = props;
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (data.length <= 0) {
    if (readOnly) {
      return (
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('resource.attrs.no_tag')}
        </span>
      );
    }
    return (
      <Space
        onClick={onEdit}
        className="flex-wrap min-h-6 cursor-pointer gap-y-4"
      >
        <Badge
          variant="outline"
          className="border-neutral-300 text-neutral-500 font-normal rounded-[8px] px-[8px] py-[2px] dark:border-neutral-500 dark:text-neutral-400"
        >
          {t('resource.attrs.add_tag')}
        </Badge>
      </Space>
    );
  }

  const maxVisibleTags = 3;
  const displayedTags = isExpanded ? data : data.slice(0, maxVisibleTags);
  const remainingCount = data.length - maxVisibleTags;

  return (
    <Space
      onClick={readOnly ? undefined : onEdit}
      className={`flex-wrap min-h-6 gap-y-4 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {displayedTags.map(tag => (
        <Badge
          key={tag.value}
          variant="outline"
          className="text-sm border-neutral-300 text-neutral-500 font-normal rounded-[8px] px-[8px] py-[1px] dark:border-neutral-500 dark:text-neutral-400"
        >
          {tag.label}
        </Badge>
      ))}
      {!isExpanded && remainingCount > 0 && (
        <Badge
          variant="outline"
          className="border-neutral-300 text-neutral-500 font-normal rounded-full min-w-[24px] min-h-[24px] justify-center px-0 py-[2px] dark:border-neutral-500 dark:text-neutral-400"
          onClick={e => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
        >
          +{remainingCount}
        </Badge>
      )}
      {isExpanded && remainingCount > 0 && (
        <Badge
          variant="outline"
          className="border-neutral-300 text-neutral-500 font-normal rounded-full min-w-[24px] min-h-[24px] justify-center px-0 py-[2px] dark:border-neutral-500 dark:text-neutral-400"
          onClick={e => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
        >
          <ChevronUp className="size-4 text-neutral-500 dark:text-neutral-400" />
        </Badge>
      )}
    </Space>
  );
}
