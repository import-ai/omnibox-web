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
        className="min-h-6 cursor-pointer flex-wrap gap-y-4"
      >
        <Badge
          variant="outline"
          className="rounded-lg border-neutral-300 px-2 py-[2px] font-normal text-neutral-500 dark:border-neutral-500 dark:text-neutral-400"
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
      className={`min-h-6 flex-wrap gap-y-4 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {displayedTags.map(tag => (
        <Badge
          key={tag.value}
          variant="outline"
          className="rounded-lg border-neutral-300 px-2 py-px text-sm font-normal text-neutral-500 dark:border-neutral-500 dark:text-neutral-400"
        >
          {tag.label}
        </Badge>
      ))}
      {!isExpanded && remainingCount > 0 && (
        <Badge
          variant="outline"
          className="min-h-[24px] min-w-[24px] justify-center rounded-full border-neutral-300 px-0 py-[2px] font-normal text-neutral-500 dark:border-neutral-500 dark:text-neutral-400"
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
          className="min-h-[24px] min-w-[24px] justify-center rounded-full border-neutral-300 px-0 py-[2px] font-normal text-neutral-500 dark:border-neutral-500 dark:text-neutral-400"
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
