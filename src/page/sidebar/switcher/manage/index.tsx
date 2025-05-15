import Group from './group';
import Member from './member';
import useContext from './use-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ManagePeople() {
  const { tab, onTab, data, refetch, search, onSearch } = useContext();

  return (
    <Tabs value={tab} onValueChange={onTab}>
      <TabsList className="w-full justify-start h-11 bg-white border-b rounded-none">
        <TabsTrigger
          value="member"
          className="flex-1 h-11 max-w-[50px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          成员 {data.member.length}
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="flex-1 h-11 max-w-[50px] text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          群组 {data.group.length}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="member">
        <Member
          search={search}
          onSearch={onSearch}
          refetch={refetch}
          data={data.member}
        />
      </TabsContent>
      <TabsContent value="group">
        <Group
          search={search}
          onSearch={onSearch}
          refetch={refetch}
          data={data.member}
        />
      </TabsContent>
    </Tabs>
  );
}
