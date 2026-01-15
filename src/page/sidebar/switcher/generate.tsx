import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Info, Plus, SquareArrowOutUpRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import GenerateForm from './form/namespace';

interface GenerateProps {
  onCloseDropdown: () => void;
}

export default function Generate({ onCloseDropdown }: GenerateProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // TODO: 这里添加具体的验证逻辑
    const quotaExceeded = true;

    if (quotaExceeded) {
      onCloseDropdown();

      toast(
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
            width: '488px',
            backgroundColor: 'white',
          },
          action: (
            <Button
              size="sm"
              className="toast-button bg-blue-500 hover:bg-blue-600"
              onClick={() => {
                location.href = '/pricing';
              }}
            >
              {t('namespace.quota_expand_button')}
              <SquareArrowOutUpRight />
            </Button>
          ),
        }
      );
    } else {
      // 验证通过，打开对话框
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="ghost"
        className="w-full justify-start text-muted-foreground"
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
