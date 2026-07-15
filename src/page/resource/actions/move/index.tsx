import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import Form, { IFormProps } from './MoveToForm';

interface IProps extends IFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MoveTo(props: IProps) {
  const {
    open,
    resourceIds,
    namespaceId,
    onOpenChange,
    onFinished,
    showDisabledTargets,
    disabledTargetIds,
    disabledTargetTooltip,
    sourceResourceType,
  } = props;
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover dark:bg-neutral-900 w-[480px] max-w-[90%] px-4 pt-6 pb-5 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('actions.move_to')}</DialogTitle>
        </DialogHeader>
        <Form
          resourceIds={resourceIds}
          namespaceId={namespaceId}
          sourceResourceType={sourceResourceType}
          onFinished={onFinished}
          showDisabledTargets={showDisabledTargets}
          disabledTargetIds={disabledTargetIds}
          disabledTargetTooltip={disabledTargetTooltip}
        />
      </DialogContent>
    </Dialog>
  );
}
