import { Plus } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { usePaywall } from '@/components/paywall/paywallContext';
import useConfig from '@/hooks/useConfig';
import { NamespaceTier } from '@/interface';
import GenerateForm from '@/page/settings/tabs/account/GenerateForm';

interface GenerateProps {
  onCloseDropdown: () => void;
}

export default function Generate({ onCloseDropdown }: GenerateProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { config } = useConfig();
  const { showPaywall } = usePaywall();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (config.commercial) {
      onCloseDropdown();
      showPaywall('namespace_create', {
        tier: NamespaceTier.BASIC,
        isOwner: true,
        trigger: 'sidebar_namespace_create',
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        trackName="sidebar_namespace_create"
        size="sm"
        variant="ghost"
        className="h-8 w-full justify-start gap-1 px-2 text-muted-foreground"
        onClick={handleClick}
      >
        <Plus className="size-4" />
        {t('namespace.add')}
      </Button>
      <DialogContent
        outsideCloseTrackName="sidebar_overlay_close"
        outsideCloseTarget="namespace"
        className="w-[90%] max-w-7xl sm:max-w-7xl p-4 sm:w-1/2 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle>{t('namespace.add')}</DialogTitle>
          <VisuallyHidden.Root>
            <DialogDescription></DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>
        <GenerateForm />
      </DialogContent>
    </Dialog>
  );
}
