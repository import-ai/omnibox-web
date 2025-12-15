import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Option } from '@/components/multiple-selector';
import Space from '@/components/space';
import { Badge } from '@/components/ui/badge';

interface IProps {
  data: Array<Option>;
  onEdit: () => void;
}

export function TagsDisplay(props: IProps) {
  const { data, onEdit } = props;
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (data.length <= 0) {
    return (
      <Space onClick={onEdit} className="flex-wrap min-h-6 cursor-pointer">
        <Badge
          variant="outline"
          className="border-[#E5E6EA] text-[#585D65] font-normal rounded-[8px] px-[8px] py-[2px] dark:border-neutral-500 dark:text-neutral-400"
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
    <Space onClick={onEdit} className="flex-wrap min-h-6 cursor-pointer">
      {displayedTags.map(tag => (
        <Badge
          key={tag.value}
          variant="outline"
          className="border-[#E5E6EA] text-[#585D65] font-normal rounded-[8px] px-[8px] py-[2px] dark:border-neutral-500 dark:text-neutral-400"
        >
          {tag.label}
        </Badge>
      ))}
      {!isExpanded && remainingCount > 0 && (
        <Badge
          variant="outline"
          className="border-[#E5E6EA] text-[#585D65] font-normal rounded-full min-w-[24px] min-h-[24px] justify-center px-0 py-[2px] dark:border-neutral-500 dark:text-neutral-400"
          onClick={e => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
        >
          +{remainingCount}
        </Badge>
      )}
    </Space>
  );
}
