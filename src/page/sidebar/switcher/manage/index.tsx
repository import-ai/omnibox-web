import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ManagePeople() {
  return (
    <Tabs defaultValue="share">
      <TabsList className="w-full justify-start h-11 bg-white border-b rounded-none px-5">
        <TabsTrigger
          value="member"
          className="flex-1 h-11 max-w-[50px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          成员
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="flex-1 h-11 max-w-[50px] text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          群组
        </TabsTrigger>
      </TabsList>
      <TabsContent value="member" className="p-4">
        aa
      </TabsContent>
      <TabsContent value="group" className="p-4">
        bb
      </TabsContent>
    </Tabs>
  );
}
