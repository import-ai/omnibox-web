import { useTranslation } from 'react-i18next';

import useNamespaceMember from '@/hooks/useNamespaceMember';

interface IProps {
  namespaceId: string;
}

export default function NamespaceMember(props: IProps) {
  const { t } = useTranslation();
  const { data, loading } = useNamespaceMember(props);

  if (loading) {
    return (
      <span className="truncate text-xs font-normal text-muted-foreground">
        --
      </span>
    );
  }

  return (
    <span className="truncate text-xs font-normal text-muted-foreground">
      {t('namespace.member_count', {
        size: data.count,
      })}
    </span>
  );
}
