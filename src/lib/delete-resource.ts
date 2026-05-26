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

export async function deleteResource({
  id,
  parentId,
  namespaceId,
  app,
  resourceType,
}: DeleteResourceParams): Promise<void> {
  await http.delete(`/namespaces/${namespaceId}/resources/${id}`);

  app.fire('delete_resource', id, parentId, resourceType);
  app.fire('trash_updated');
}
