import { t } from 'i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShareType, shareTypeToString } from '@/interface';

export interface ShareTypeProps {
  disabled?: boolean;
  shareType: ShareType;
  onChange?: (type: ShareType) => void;
}

export function ShareTypeSelector(props: ShareTypeProps) {
  const { disabled, shareType, onChange } = props;
  const shareTypes = ['doc_only' as ShareType, 'all' as ShareType];

  return (
    <Select disabled={disabled} value={shareType} onValueChange={onChange}>
      <SelectTrigger className="w-36 h-6">
        <SelectValue placeholder={t('share.share.ai_chat')} />
      </SelectTrigger>
      <SelectContent>
        {shareTypes.map(type => (
          <SelectItem key={type} value={type}>
            {shareTypeToString(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
