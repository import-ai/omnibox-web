import copy from 'copy-to-clipboard';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';

interface IProps {
  content: string;
  htmlContent?: string;
  tooltip?: string;
}

export default function CopyMain(props: IProps) {
  const { content, htmlContent, tooltip } = props;
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyWithFallback = () => {
    try {
      return copy(content, {
        ...(htmlContent
          ? {
              onCopy: clipboardData => {
                const data = clipboardData as {
                  clearData?: () => void;
                  setData?: (format: string, data: string) => void;
                };
                data.clearData?.();
                data.setData?.('text/plain', content);
                data.setData?.('text/html', htmlContent);
              },
            }
          : { format: 'text/plain' }),
      });
    } catch {
      return false;
    }
  };

  const handleCopy = async () => {
    let success = false;
    if (htmlContent && navigator.clipboard?.write && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([content], { type: 'text/plain' }),
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
          }),
        ]);
        success = true;
      } catch {
        success = copyWithFallback();
      }
    } else {
      success = copyWithFallback();
    }

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
        <p>{tooltip || t('chat.messages.actions.copy')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
