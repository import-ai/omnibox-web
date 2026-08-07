import { Share as ShareIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { useIsMobile } from '@/hooks/useMobile';
import { ResourceType } from '@/interface';

import ShareTabs from './ShareTabs';

export interface ShareActionProps {
  namespaceId: string;
  resourceId: string;
  spaceType: string;
  resourceType: ResourceType;
}

export default function ShareAction(props: ShareActionProps) {
  const { namespaceId, resourceId, spaceType, resourceType } = props;
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <ShareIcon />
          {t('share.share.title')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align={isMobile ? 'center' : 'end'}
        alignOffset={isMobile ? 0 : -106}
        className="w-full sm:w-[456px] p-0 overflow-hidden"
      >
        <ShareTabs
          namespaceId={namespaceId}
          resourceId={resourceId}
          showPermissions={spaceType === 'teamspace'}
          resourceType={resourceType}
        />
      </PopoverContent>
    </Popover>
  );
}
