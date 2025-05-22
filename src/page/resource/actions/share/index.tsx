import Form from './form';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function Share() {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 min-w-7">
          {t('share.title')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        alignOffset={-106}
        className="w-[456px] p-0 overflow-hidden"
      >
        <Form />
      </PopoverContent>
    </Popover>
  );
}
