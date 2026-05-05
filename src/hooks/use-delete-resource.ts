import useApp from '@/hooks/use-app';
import { ResourceType } from '@/interface';
import { deleteResource as deleteResourceBase } from '@/lib/delete-resource';

interface DeleteResourceOptions {
  id: string;
  parentId: string | null;
  namespaceId: string;
  resourceType?: ResourceType;
  onSuccess?: () => void;
}

export function useDeleteResource() {
  const app = useApp();

  const deleteResource = async (options: DeleteResourceOptions) => {
    const { id, parentId, namespaceId, resourceType, onSuccess } = options;

    await deleteResourceBase({ id, parentId, namespaceId, app, resourceType });

    // Navigation is handled by delete_resource event handler in useContext.ts
    // to automatically select the next resource (consistent with sidebar)

    onSuccess?.();
  };

  return { deleteResource };
}

export default useDeleteResource;
