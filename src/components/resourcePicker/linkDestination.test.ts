import { withLinkDestinationAvailability } from './linkDestination';
import type { ResourcePickerResource } from './resourcePickerTypes';

const t = (key: string) => key;

function resource(
  resourceType: ResourcePickerResource['resource_type'],
  children?: ResourcePickerResource[]
): ResourcePickerResource {
  return {
    id: resourceType,
    name: resourceType,
    parent_id: null,
    resource_type: resourceType,
    children,
  };
}

describe('withLinkDestinationAvailability', () => {
  it('disables subscription and smart folders with the unsupported tooltip', () => {
    expect(
      withLinkDestinationAvailability(resource('rss_folder'), t)
    ).toMatchObject({
      disabled: true,
      disabledTooltip: 'link.rss_folder_unsupported',
    });
    expect(
      withLinkDestinationAvailability(resource('smart_folder'), t)
    ).toMatchObject({
      disabled: true,
      disabledTooltip: 'link.smart_folder_unsupported',
    });
  });

  it('disables rss items and other read-only resources', () => {
    expect(
      withLinkDestinationAvailability(resource('rss_item'), t)
    ).toMatchObject({
      disabled: true,
      disabledTooltip: 'link.rss_item_unsupported',
    });
    expect(
      withLinkDestinationAvailability(
        { ...resource('doc'), read_only: true },
        t
      )
    ).toMatchObject({
      disabled: true,
      disabledTooltip: 'resource.read_only_target',
    });
  });

  it('leaves ordinary folders selectable and still disables nested managed folders', () => {
    const folder = withLinkDestinationAvailability(
      resource('folder', [resource('rss_folder'), resource('file')]),
      t
    );

    expect(folder.disabled).toBeUndefined();
    expect(folder.children?.[0]).toMatchObject({
      disabled: true,
      disabledTooltip: 'link.rss_folder_unsupported',
    });
    expect(folder.children?.[1].disabled).toBeUndefined();
  });
});
