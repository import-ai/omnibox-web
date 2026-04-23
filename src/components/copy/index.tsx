import copy from 'copy-to-clipboard';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';

interface IProps {
  content: string;
  tooltip?: string;
}

export default function CopyMain(props: IProps) {
  const { content, tooltip } = props;
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (
      copy(content, {
        format: 'text/plain',
      })
    ) {
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
          <Button size="icon" variant="ghost" className="size-7 p-0">
            <Check />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="size-7 p-0"
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
