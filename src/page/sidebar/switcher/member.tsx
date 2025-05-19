// import { LoaderCircle } from 'lucide-react';
import useNamespaceMember from '@/hooks/use-namespace-member';

interface IProps {
  namespaceId: string;
}

export default function NamespaceMember(props: IProps) {
  const { data } = useNamespaceMember(props);

  // if (loading) {
  //   return <LoaderCircle className="transition-transform animate-spin" />;
  // }

  return (
    <span className="truncate font-normal text-xs text-gray-400">
      {data.length} 位成员
    </span>
  );
}
