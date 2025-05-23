import { useTranslation } from 'react-i18next';
import useNamespaceMember from '@/hooks/use-namespace-member';

interface IProps {
  namespaceId: string;
}

export default function NamespaceMember(props: IProps) {
  const { t } = useTranslation();
  const { data, loading } = useNamespaceMember(props);

  if (loading) {
    return (
      <span className="truncate font-normal text-xs text-gray-400">--</span>
    );
  }

  return (
    <span className="truncate font-normal text-xs text-gray-400">
      {t('namespace.member_count', {
        size: data.length,
      })}
    </span>
  );
}
