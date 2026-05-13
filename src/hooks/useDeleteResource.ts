import useApp from '@/hooks/useApp';
import { deleteResource as deleteResourceBase } from '@/lib/deleteResource';

interface DeleteResourceOptions {
  id: string;
  parentId: string | null;
  namespaceId: string;
  onSuccess?: () => void;
}

export function useDeleteResource() {
  const app = useApp();

  const deleteResource = async (options: DeleteResourceOptions) => {
    const { id, parentId, namespaceId, onSuccess } = options;

    await deleteResourceBase({ id, parentId, namespaceId, app });

    // Navigation is handled by delete_resource event handler in useContext.ts
    // to automatically select the next resource (consistent with sidebar)

    onSuccess?.();
  };

  return { deleteResource };
}

export default useDeleteResource;
