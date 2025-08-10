import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import GenerateForm from './form/namespace';

export default function Generate() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
        >
          <Plus className="size-4" />
          {t('namespace.add')}
        </Button>
      </DialogTrigger>
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
