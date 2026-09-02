import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ResourceType } from '@/interface';

import Invite from './permissions/InviteForm';
import Table from './permissions/table';
import useResourcePermissions from './permissions/useResourcePermissions';
import { ShareTabContent } from './share';

export interface ShareTabsProps {
  namespaceId: string;
  resourceId: string;
  showPermissions?: boolean;
  resourceType: ResourceType;
}

export default function ShareTabs(props: ShareTabsProps) {
  const { namespaceId, resourceId, showPermissions, resourceType } = props;
  const { t } = useTranslation();
  const permissions = useResourcePermissions(
    namespaceId,
    resourceId,
    Boolean(showPermissions)
  );

  return (
    <Tabs defaultValue={showPermissions ? 'permissions' : 'share'}>
      <TabsList className="w-full justify-start h-11 border-b rounded-none px-5">
        {showPermissions && (
          <TabsTrigger
            value="permissions"
            className="flex-1 h-11 max-w-[80px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent"
          >
            {t('share.permissions.title')}
          </TabsTrigger>
        )}
        <TabsTrigger
          value="share"
          className="flex-1 h-11 max-w-[80px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent"
        >
          {t('share.share.title')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="permissions" className="px-4 pt-4 pb-2">
        <Invite
          resource_id={resourceId}
          namespace_id={namespaceId}
          permissions={permissions.data}
          permissionsLoading={permissions.loading}
          permissionsReady={permissions.ready}
          permissionsError={permissions.error}
          refetch={permissions.refetch}
        />
        <Table
          resource_id={resourceId}
          namespace_id={namespaceId}
          data={permissions.data}
          refetch={permissions.refetch}
        />
      </TabsContent>
      <TabsContent value="share" className="px-4 pt-4 pb-2">
        <ShareTabContent
          key={`${namespaceId}/${resourceId}`}
          resource_id={resourceId}
          namespace_id={namespaceId}
          resourceType={resourceType}
        />
      </TabsContent>
    </Tabs>
  );
}
