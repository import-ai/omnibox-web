import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';

interface TrashSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TrashSearch({ value, onChange }: TrashSearchProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={t('trash.search_placeholder')}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-9 h-9 text-sm rounded-md border-border placeholder:text-muted-foreground bg-transparent"
      />
    </div>
  );
}
