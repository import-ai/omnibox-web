import useApp from '@/hooks/useApp';
import { ResourceType } from '@/interface';
import { removeFromChatContext } from '@/lib/chatBridge';
import { http } from '@/lib/request';
import { useSidebarStore } from '@/page/sidebar/store';
import { getDescendantIds } from '@/page/sidebar/store/utils';

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

  const nodes = useSidebarStore.getState().nodes;
  removeFromChatContext([id, ...getDescendantIds(nodes, id)]);

  app.fire('delete_resource', id, parentId, resourceType);

  app.fire('trash_updated');
}
