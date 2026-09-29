import { Share as ShareIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
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
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="w-7 px-0 sm:w-auto sm:px-2.5"
            >
              <ShareIcon />
              <span className="sr-only sm:not-sr-only">
                {t('share.share.title')}
              </span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('share.share.title')}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align={isMobile ? 'center' : 'end'}
        alignOffset={isMobile ? 0 : -106}
        collisionPadding={16}
        className="w-[min(456px,calc(100vw-2rem))] p-0 overflow-hidden"
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
