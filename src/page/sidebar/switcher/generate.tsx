import { Plus } from 'lucide-react';
import GenerateForm from './form/namespace';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
      <DialogContent className="w-1/2 max-w-7xl">
        <DialogHeader>
          <DialogTitle>{t('namespace.add')}</DialogTitle>
        </DialogHeader>
        <GenerateForm />
      </DialogContent>
    </Dialog>
  );
}
