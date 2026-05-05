import useApp from '@/hooks/use-app';
import { ResourceType } from '@/interface';
import { http } from '@/lib/request';

interface DeleteResourceParams {
  id: string;
  parentId: string | null;
  namespaceId: string;
  app: ReturnType<typeof useApp>;
  resourceType?: ResourceType;
}

/**
 * Unified delete resource function
 * All delete operations (sidebar, resource page, drag-to-trash) should use this
 */
export async function deleteResource({
  id,
  parentId,
  namespaceId,
  app,
  resourceType,
}: DeleteResourceParams): Promise<void> {
  await http.delete(`/namespaces/${namespaceId}/resources/${id}`);

  // Trigger delete_resource event for data update and toast notification
  app.fire('delete_resource', id, parentId, resourceType);

  // Notify trash panel to update icon
  app.fire('trash_updated');
}
