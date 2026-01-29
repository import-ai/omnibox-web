import { useTranslation } from 'react-i18next';

import DeleteIcon from '@/assets/deleteIcon.png';

export default function DeletedResourcePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center pt-[20vh]">
      <img
        src={DeleteIcon}
        alt="deleted"
        className="size-[clamp(120px,18vw,200px)]"
      />
      <p className="text-foreground text-lg font-semibold">
        {t('deleted_resource.title')}
      </p>
      <p className="text-muted-foreground text-base text-center max-w-[58%] mt-1">
        {t('deleted_resource.desc')}
      </p>
      <p className="text-muted-foreground text-base">
        {t('deleted_resource.hint')}
      </p>
    </div>
  );
}
