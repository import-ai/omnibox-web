import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

import Group from './groups';
import Member from './MemberMain';
import useContext from './useContext';

interface ManagePeopleProps {
  canManageMembers: boolean;
}

export default function ManagePeople({ canManageMembers }: ManagePeopleProps) {
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
  } = useContext(canManageMembers);

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={onTab} className="w-full">
      <TabsList>
        <TabsTrigger value="member">
          {t('manage.member')} {data.member.length}
        </TabsTrigger>
        {canManageMembers && (
          <TabsTrigger value="group">
            {t('manage.group')} {data.group.length}
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="member" className="mt-0 pt-2 lg:pt-4">
        <Member
          search={search}
          refetch={refetch}
          onSearch={onSearch}
          namespace_id={namespace_id}
          namespaceName={namespaceName}
          canManageMembers={canManageMembers}
          data={
            search
              ? data.member.filter(item => {
                  const q = search.toLowerCase();
                  return [
                    item.email,
                    item.username,
                    item.nickname,
                    item.note,
                  ].some(value => (value || '').toLowerCase().includes(q));
                })
              : data.member
          }
        />
      </TabsContent>
      {canManageMembers && (
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
      )}
    </Tabs>
  );
}
