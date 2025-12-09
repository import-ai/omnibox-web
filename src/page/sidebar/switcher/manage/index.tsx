import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import Group from './group';
import Member from './member';
import useContext from './use-context';

export default function ManagePeople() {
  const { t } = useTranslation();
  const { tab, onTab, data, refetch, search, onSearch, namespace_id } =
    useContext();

  return (
    <Tabs value={tab} onValueChange={onTab}>
      <TabsList className="h-11 w-full justify-start rounded-none border-b border-border bg-transparent">
        <TabsTrigger
          value="member"
          className="h-11 max-w-[120px] flex-1 text-sm font-bold text-muted-foreground data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          {t('manage.member')} {data.member.length}
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="h-11 max-w-[120px] flex-1 text-sm font-bold text-muted-foreground data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          {t('manage.group')} {data.group.length}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="member">
        <Member
          search={search}
          refetch={refetch}
          onSearch={onSearch}
          namespace_id={namespace_id}
          data={
            search
              ? data.member.filter(
                  item =>
                    item.email?.indexOf(search) >= 0 ||
                    item.username.indexOf(search) >= 0
                )
              : data.member
          }
        />
      </TabsContent>
      <TabsContent value="group">
        <Group
          search={search}
          refetch={refetch}
          onSearch={onSearch}
          member={data.member}
          namespace_id={namespace_id}
          data={
            search
              ? data.group.filter(item => item.title.indexOf(search) >= 0)
              : data.group
          }
        />
      </TabsContent>
    </Tabs>
  );
}
