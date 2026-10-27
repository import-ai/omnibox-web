import type { ResourcePickerResource } from './resourcePickerTypes';

const unsupportedLinkTargetKey = {
  rss_folder: 'link.rss_folder_unsupported',
  smart_folder: 'link.smart_folder_unsupported',
} as const;

/** Subscription and smart folders cannot hold a newly saved link. */
export function withLinkDestinationAvailability(
  resource: ResourcePickerResource,
  t: (key: string) => string
): ResourcePickerResource {
  const unsupportedKey =
    resource.resource_type === 'rss_folder' ||
    resource.resource_type === 'smart_folder'
      ? unsupportedLinkTargetKey[resource.resource_type]
      : undefined;

  return {
    ...resource,
    children: resource.children?.map(child =>
      withLinkDestinationAvailability(child, t)
    ),
    ...(unsupportedKey
      ? { disabled: true, disabledTooltip: t(unsupportedKey) }
      : {}),
  };
}
