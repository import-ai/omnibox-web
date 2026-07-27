import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/Spinner';
import type { Resource } from '@/interface';
import type { RootResourcesResponse } from '@/service/resource';

export interface APIKeyPermissionScopeData {
  name?: string;
  rootType?: string;
}

export function buildAPIKeyPermissionScopes(
  resourceIds: string[],
  resources: Resource[],
  roots: RootResourcesResponse
) {
  const scopes = Object.fromEntries(
    resourceIds.map(resourceId => [resourceId, {}])
  ) as Record<string, APIKeyPermissionScopeData>;

  resources.forEach(resource => {
    if (scopes[resource.id]) scopes[resource.id].name = resource.name;
  });
  Object.entries(roots).forEach(([rootType, root]) => {
    if (scopes[root.id]) scopes[root.id].rootType = rootType;
  });

  return scopes;
}

export function APIKeyPermissionScope({
  namespaceId,
  resourceId,
  scope,
}: {
  namespaceId: string;
  resourceId: string;
  scope?: APIKeyPermissionScopeData;
}) {
  const { t } = useTranslation();

  if (!scope) return <Spinner className="text-muted-foreground" />;

  const label =
    scope.rootType === 'private'
      ? t('api_key.personal')
      : scope.rootType === 'teamspace'
        ? t('teamspace')
        : scope.name;

  if (!label) {
    return (
      <span className="text-sm font-semibold text-foreground">
        {t('api_key.resource_not_found')}
      </span>
    );
  }

  if (scope.rootType === 'private' || scope.rootType === 'teamspace') {
    return (
      <span
        title={label}
        className="inline-block max-w-full truncate align-bottom text-sm font-semibold text-foreground"
      >
        {label}
      </span>
    );
  }

  return (
    <a
      href={`/${namespaceId}/${resourceId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="inline-block max-w-full truncate align-bottom text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
    >
      {label}
    </a>
  );
}
