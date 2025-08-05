import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShareType, ShareTypes, shareTypeToString } from '@/interface';

export interface ShareTypeProps {
  disabled?: boolean;
  shareType: ShareType;
  onChange?: (type: ShareType) => void;
}

export function ShareTypeSelector(props: ShareTypeProps) {
  const { disabled, shareType, onChange } = props;

  return (
    <Select disabled={disabled} value={shareType} onValueChange={onChange}>
      <SelectTrigger className="w-36 h-6">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        {ShareTypes.map((type) => (
          <SelectItem value={type}>{shareTypeToString(type)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
