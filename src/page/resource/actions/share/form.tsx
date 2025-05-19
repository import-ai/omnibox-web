import User from './user';
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
      <TabsList className="w-full justify-start h-11 bg-white border-b rounded-none px-5">
        <TabsTrigger
          value="share"
          className="flex-1 h-11 max-w-[50px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
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
      <TabsContent value="share" className="p-4">
        <Invite resource_id={resource_id} namespace_id={namespace_id} />
        <User resource_id={resource_id} namespace_id={namespace_id} />
      </TabsContent>
      {/* <TabsContent value="publish"></TabsContent> */}
    </Tabs>
  );
}
