import { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IProps {
  content: string;
}

export default function CopyMain(props: IProps) {
  const { content } = props;
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
          <Button size="icon" variant="ghost" className="p-0 w-7 h-7">
            <Check />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="p-0 w-7 h-7"
            onClick={handleCopy}
          >
            <Copy />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('copy.title')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
