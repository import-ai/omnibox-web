import copy from 'copy-to-clipboard';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import type { ButtonTrackProps } from '@/lib/trackButtonClick';

interface IProps {
  content: string;
  htmlContent?: string;
  tooltip?: string;
  trackName?: string;
  trackProps?: ButtonTrackProps;
}

export default function CopyMain(props: IProps) {
  const { content, htmlContent, tooltip, trackName, trackProps } = props;
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const success = copy(content, {
      ...(htmlContent
        ? {
            onCopy: clipboardData => {
              const data = clipboardData as DataTransfer;
              data.clearData();
              data.setData('text/plain', content);
              data.setData('text/html', htmlContent);
            },
          }
        : { format: 'text/plain' }),
    });

    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {copied ? (
          <Button
            size="icon"
            variant="ghost"
            className={`${sidebarToolbarIconButtonClassName} size-7`}
          >
            <Check />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className={`${sidebarToolbarIconButtonClassName} size-7`}
            trackName={trackName}
            trackProps={trackProps}
            onClick={handleCopy}
          >
            <Copy />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip || t('chat.messages.actions.copy')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
