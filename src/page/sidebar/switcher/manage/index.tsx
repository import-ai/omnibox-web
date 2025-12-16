import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import Group from './group';
import Member from './member';
import useContext from './use-context';

export default function ManagePeople() {
  const { t } = useTranslation();
  const { tab, onTab, data, refetch, search, onSearch, loading, namespace_id } =
    useContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={onTab} className="w-full">
      <TabsList className="h-9 lg:h-11 w-full justify-start rounded-none border-b border-border bg-transparent shrink-0">
        <TabsTrigger
          value="member"
          className="h-9 lg:h-11 max-w-[100px] lg:max-w-[120px] flex-1 text-xs lg:text-sm font-bold text-muted-foreground data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          {t('manage.member')} {data.member.length}
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="h-9 lg:h-11 max-w-[100px] lg:max-w-[120px] flex-1 text-xs lg:text-sm font-bold text-muted-foreground data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          {t('manage.group')} {data.group.length}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="member" className="pt-2 lg:pt-4 mt-0">
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
      <TabsContent value="group" className="pt-2 lg:pt-4 mt-0">
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
