import { UserPen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface IProps {
  onEdit: () => void;
}

function ReEdit(props: IProps) {
  const { t } = useTranslation();
  const { onEdit } = props;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onEdit}
          size="icon"
          variant="ghost"
          className="p-0 w-7 h-7"
        >
          <UserPen />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('chat.re_edit')}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default ReEdit;
