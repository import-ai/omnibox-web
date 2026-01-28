import { useTranslation } from 'react-i18next';

import DeleteIcon from '@/assets/deleteIcon.svg';

export default function DeletedResourcePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center pt-[20vh]">
      <img src={DeleteIcon} alt="deleted" className="w-[220px] h-[220px]" />
      <p className="text-neutral-300 dark:text-neutral-600 text-lg">
        {t('deleted_resource.title')}
      </p>
    </div>
  );
}
