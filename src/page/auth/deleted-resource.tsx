import { useTranslation } from 'react-i18next';

import DeleteIcon from '@/assets/deleteIcon.svg';

export default function DeletedResourcePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center pt-[20vh]">
      <img
        src={DeleteIcon}
        alt="deleted"
        className="w-[clamp(120px,18vw,200px)] h-[clamp(120px,18vw,200px)]"
      />
      <p className="text-neutral-800 dark:text-neutral-100 text-lg font-semibold">
        {t('deleted_resource.title')}
      </p>
      <p className="text-neutral-400 dark:text-neutral-500 text-base text-center max-w-[58%] mt-1">
        {t('deleted_resource.desc')}
      </p>
      <p className="text-neutral-400 dark:text-neutral-500 text-base">
        {t('deleted_resource.hint')}
      </p>
    </div>
  );
}
