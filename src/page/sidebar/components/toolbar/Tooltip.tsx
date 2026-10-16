import { IconButton } from '@/components/omnibox/IconButton';
import { Spinner } from '@/components/ui/Spinner';

interface IProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabledLabel?: string;
  iconClassName?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function ToolbarButton({
  label,
  onClick,
  icon: Icon,
  disabledLabel,
  iconClassName,
  loading,
  disabled = false,
}: IProps) {
  const unavailable = !!disabledLabel || loading || disabled;

  return (
    <IconButton
      size="xs"
      tone="sidebar"
      label={disabledLabel || label}
      onClick={onClick}
      disabled={unavailable}
    >
      {loading ? <Spinner /> : <Icon className={iconClassName ?? 'size-4'} />}
    </IconButton>
  );
}
