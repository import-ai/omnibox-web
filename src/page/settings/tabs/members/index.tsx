import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import Group from './groups';
import Member from './member-list';
import useContext from './use-context';

export default function ManagePeople() {
  const { t } = useTranslation();
  const {
    tab,
    onTab,
    data,
    refetch,
    search,
    onSearch,
    loading,
    namespace_id,
    namespaceName,
  } = useContext();

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={onTab} className="w-full">
      <TabsList className="h-9 w-full shrink-0 justify-start rounded-none border-b border-border bg-transparent lg:h-11">
        <TabsTrigger
          value="member"
          className="h-9 max-w-[100px] flex-1 text-xs font-bold text-muted-foreground data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none lg:h-11 lg:max-w-[120px] lg:text-sm"
        >
          {t('manage.member')} {data.member.length}
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="h-9 max-w-[100px] flex-1 text-xs font-bold text-muted-foreground data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none lg:h-11 lg:max-w-[120px] lg:text-sm"
        >
          {t('manage.group')} {data.group.length}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="member" className="mt-0 pt-2 lg:pt-4">
        <Member
          search={search}
          refetch={refetch}
          onSearch={onSearch}
          namespace_id={namespace_id}
          namespaceName={namespaceName}
          data={
            search
              ? data.member.filter(
                  item =>
                    (item.email?.indexOf(search) ?? -1) >= 0 ||
                    item.username.indexOf(search) >= 0
                )
              : data.member
          }
        />
      </TabsContent>
      <TabsContent value="group" className="mt-0 pt-2 lg:pt-4">
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
