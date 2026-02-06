import { useTranslation } from 'react-i18next';

import DeleteIcon from '@/assets/deleteIcon.png';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export default function DeletedResourcePage() {
  const { t } = useTranslation();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <img
            src={DeleteIcon}
            alt="deleted"
            className="size-[clamp(120px,18vw,200px)]"
          />
        </EmptyMedia>
        <EmptyTitle>{t('deleted_resource.title')}</EmptyTitle>
        <EmptyDescription>{t('deleted_resource.desc')}</EmptyDescription>
        <EmptyDescription>{t('deleted_resource.hint')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
