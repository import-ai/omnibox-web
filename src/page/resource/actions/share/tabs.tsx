import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import Invite from './permissions/invite';
import Table from './permissions/table';
import { ShareTabContent } from './share';

export interface ShareTabsProps {
  showPermissions?: boolean;
}

export default function ShareTabs(props: ShareTabsProps) {
  const { showPermissions } = props;
  const { t } = useTranslation();
  const params = useParams();
  const resource_id = params.resource_id || '';
  const namespace_id = params.namespace_id || '';

  return (
    <Tabs defaultValue={showPermissions ? 'permissions' : 'share'}>
      <TabsList className="h-11 w-full justify-start rounded-none border-b px-5">
        {showPermissions && (
          <TabsTrigger
            value="permissions"
            className="h-11 max-w-[80px] flex-1 data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t('share.permissions.title')}
          </TabsTrigger>
        )}
        <TabsTrigger
          value="share"
          className="h-11 max-w-[80px] flex-1 data-[state=active]:rounded-none data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {t('share.share.title')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="permissions" className="px-4 pb-2 pt-4">
        <Invite resource_id={resource_id} namespace_id={namespace_id} />
        <Table resource_id={resource_id} namespace_id={namespace_id} />
      </TabsContent>
      <TabsContent value="share" className="px-4 pb-2 pt-4">
        <ShareTabContent
          resource_id={resource_id}
          namespace_id={namespace_id}
        />
      </TabsContent>
    </Tabs>
  );
}
