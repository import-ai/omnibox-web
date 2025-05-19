import Group from './group';
import Member from './member';
import useContext from './use-context';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ManagePeople() {
  const { t } = useTranslation();
  const { tab, onTab, data, refetch, search, onSearch, namespace_id } =
    useContext();

  return (
    <Tabs value={tab} onValueChange={onTab}>
      <TabsList className="w-full justify-start h-11 bg-white border-b rounded-none">
        <TabsTrigger
          value="member"
          className="flex-1 h-11 max-w-[50px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          {t('manage.member')} {data.member.length}
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="flex-1 h-11 max-w-[50px] text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          {t('manage.group')} {data.group.length}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="member">
        <Member
          search={search}
          onSearch={onSearch}
          refetch={refetch}
          data={
            search
              ? data.member.filter((item) => item.email.indexOf(search) >= 0)
              : data.member
          }
        />
      </TabsContent>
      <TabsContent value="group">
        <Group
          search={search}
          onSearch={onSearch}
          refetch={refetch}
          data={
            search
              ? data.group.filter((item) => item.title.indexOf(search) >= 0)
              : data.group
          }
          namespace_id={namespace_id}
          member={data.member}
        />
      </TabsContent>
    </Tabs>
  );
}
