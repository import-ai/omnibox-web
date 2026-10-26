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
      <TabsList
        variant="line"
        className="w-full justify-start border-b border-border px-4 group-data-horizontal/tabs:h-11"
      >
        {showPermissions && (
          <TabsTrigger
            value="permissions"
            className="h-full max-w-24 px-4 group-data-horizontal/tabs:after:bottom-[-3px]"
          >
            {t('share.permissions.title')}
          </TabsTrigger>
        )}
        <TabsTrigger
          value="share"
          className="h-full max-w-24 px-4 group-data-horizontal/tabs:after:bottom-[-3px]"
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
