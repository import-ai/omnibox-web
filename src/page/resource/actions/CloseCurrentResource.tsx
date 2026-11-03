import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { useExpandCopilot } from '@/page/copilot/useExpandCopilot';

interface CloseCurrentResourceProps {
  namespaceId: string;
}

/** Closes the resource pane and promotes the current Copilot view to full page. */
export default function CloseCurrentResource({
  namespaceId,
}: CloseCurrentResourceProps) {
  const { t } = useTranslation();
  const handleClose = useExpandCopilot(namespaceId);

  return (
    <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleClose}>
      <X className="size-4 text-muted-foreground" />
      <span>{t('resource.close_current')}</span>
    </DropdownMenuItem>
  );
}
