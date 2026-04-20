import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Info, Plus, SquareArrowOutUpRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useConfig from '@/hooks/use-config';
import GenerateForm from '@/page/settings/tabs/account/namespace';

interface GenerateProps {
  onCloseDropdown: () => void;
}

export default function Generate({ onCloseDropdown }: GenerateProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { config } = useConfig();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (config.commercial) {
      onCloseDropdown();

      const toastId = toast(
        <div className="flex gap-1.5">
          <Info className="size-5 text-yellow-400" />
          <span>{t('namespace.quota_exceeded')}</span>
        </div>,
        {
          description: t('namespace.quota_exceeded_desc'),
          position: 'top-center',
          duration: 10000,
          className: 'justify-between',
          style: {
            left: '50%',
            width: 'min(90vw, 488px)',
            marginLeft: 'calc(min(90vw, 488px) * -0.5)',
          },
          action: (
            <a
              href={`/${i18n.language === 'en-US' ? 'en' : 'zh-cn'}/pricing`}
              target="_blank"
              rel="noopener noreferrer"
              className="toast-button"
              onClick={() => {
                toast.dismiss(toastId);
              }}
            >
              <Button
                variant="default"
                className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
              >
                {t('namespace.quota_expand_button')}
                <SquareArrowOutUpRight />
              </Button>
            </a>
          ),
        }
      );
    } else {
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="ghost"
        className="w-full gap-1 justify-start text-muted-foreground px-2"
        onClick={handleClick}
      >
        <Plus className="size-4" />
        {t('namespace.add')}
      </Button>
      <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('namespace.add')}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription></DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <GenerateForm />
      </DialogContent>
    </Dialog>
  );
}
