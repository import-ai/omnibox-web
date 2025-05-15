import GroupData from './data';
import { NamespaceMember } from '@/interface';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface GroupProps {
  search: string;
  refetch: () => void;
  data: Array<NamespaceMember>;
  onSearch: (value: string) => void;
}

export default function Group(props: GroupProps) {
  const { search, data, onSearch } = props;
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('manage.search')}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Button size="sm" variant="default">
          创建群组
        </Button>
      </div>
      <div className="rounded-md border">
        <div className="border-gray-200">
          <div className="grid grid-cols-12 text-gray-500 border-b border-gray-200">
            <div className="col-span-6 text-sm h-10 leading-10 px-2">群组</div>
            <div className="col-span-4 text-sm h-10 leading-10 px-2">成员</div>
            <div className="col-span-2 text-sm h-10 leading-10 px-2"></div>
          </div>
          <div className="border-gray-200">
            {data.map((item) => (
              <GroupData key={item.email} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
