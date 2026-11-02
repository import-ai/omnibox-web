import type { ResourcePickerResource } from './resourcePickerTypes';

const unsupportedLinkTargetKey = {
  rss_folder: 'link.rss_folder_unsupported',
  smart_folder: 'link.smart_folder_unsupported',
  rss_item: 'link.rss_item_unsupported',
} as const;

/** Managed and read-only resources cannot hold a newly saved link. */
export function withLinkDestinationAvailability(
  resource: ResourcePickerResource,
  t: (key: string) => string
): ResourcePickerResource {
  const unsupportedKey =
    resource.resource_type === 'rss_folder' ||
    resource.resource_type === 'smart_folder' ||
    resource.resource_type === 'rss_item'
      ? unsupportedLinkTargetKey[resource.resource_type]
      : resource.read_only
        ? 'resource.read_only_target'
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
