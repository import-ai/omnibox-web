import { useTranslation } from 'react-i18next';

import { ResourceSelect } from '@/components/resourceSelect';

export interface APIKeyScopeSelection {
  root_resource_id: string;
  resource_scope?: 'resource' | 'personal_and_team';
}

export function APIKeyScopeSelect({
  namespaceId,
  value,
  loading,
  onChange,
}: {
  namespaceId: string;
  value: APIKeyScopeSelection;
  loading: boolean;
  onChange: (selection: APIKeyScopeSelection) => void;
}) {
  const { t } = useTranslation();
  const combined = value.resource_scope === 'personal_and_team';
  return (
    <>
      <ResourceSelect
        includePersonalAndTeam
        enableManagedFolders
        namespaceId={namespaceId}
        resourceId={combined ? 'personal_and_team' : value.root_resource_id}
        loading={loading}
        className="w-full"
        onChange={id =>
          onChange({
            root_resource_id:
              id === 'personal_and_team' ? value.root_resource_id : id,
            resource_scope:
              id === 'personal_and_team' ? 'personal_and_team' : 'resource',
          })
        }
        placeholder={t('api_key.root_resource_id_placeholder')}
      />
      {combined && (
        <p className="text-xs text-muted-foreground">
          {t('api_key.personal_and_team_hint')}
        </p>
      )}
    </>
  );
}
