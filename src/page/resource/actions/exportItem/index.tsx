import { SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

interface IActionProps {
  format: string;
  actionId: string;
  handleAction: (id: string) => void;
  setDownloadAsOpen: (value: SetStateAction<boolean>) => void;
}
function ExportItem(props: IActionProps) {
  const { format, actionId, handleAction, setDownloadAsOpen } = props;
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <button
        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
        onClick={() => {
          handleAction(actionId);
          setDownloadAsOpen(false);
        }}
      >
        {t('actions.download_as_tooltip', {
          format: format,
        })}
      </button>
    </div>
  );
}

export default ExportItem;
