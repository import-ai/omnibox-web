import Table from './table';
import Invite from './invite';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ShareForm() {
  const { t } = useTranslation();
  const params = useParams();
  const resource_id = params.resource_id || '';
  const namespace_id = params.namespace_id || '';

  return (
    <Tabs defaultValue="share">
      <TabsList className="w-full justify-start h-11 border-b rounded-none px-5">
        <TabsTrigger
          value="share"
          className="flex-1 h-11 max-w-[80px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent"
        >
          {t('share.title')}
        </TabsTrigger>
        {/* <TabsTrigger
          value="publish"
          className="flex-1 h-11 max-w-[50px] text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          发布
        </TabsTrigger> */}
      </TabsList>
      <TabsContent value="share" className="px-4 pt-4 pb-2">
        <Invite resource_id={resource_id} namespace_id={namespace_id} />
        <Table resource_id={resource_id} namespace_id={namespace_id} />
      </TabsContent>
      {/* <TabsContent value="publish"></TabsContent> */}
    </Tabs>
  );
}
