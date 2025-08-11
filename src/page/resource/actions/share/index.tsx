import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';

import ShareTabs from './tabs';

export default function Share() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 min-w-7">
          {t('share.share.title')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align={isMobile ? 'center' : 'end'}
        alignOffset={isMobile ? 0 : -106}
        className="w-full sm:w-[456px] p-0 overflow-hidden"
      >
        <ShareTabs />
      </PopoverContent>
    </Popover>
  );
}
