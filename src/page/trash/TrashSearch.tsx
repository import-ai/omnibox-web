import { useTranslation } from 'react-i18next';

import { SearchField } from '@/components/search/SearchField';

interface TrashSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TrashSearch({ value, onChange }: TrashSearchProps) {
  const { t } = useTranslation();

  return (
    <SearchField
      value={value}
      onValueChange={onChange}
      placeholder={t('trash.search_placeholder')}
      showClear
      clearLabel={t('search.clear')}
      containerClassName="h-9 min-h-9 rounded-md bg-transparent shadow-none dark:bg-transparent"
      inputClassName="h-9 text-sm md:text-sm"
    />
  );
}
