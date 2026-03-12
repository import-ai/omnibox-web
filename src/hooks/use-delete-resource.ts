import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';

interface DeleteResourceOptions {
  id: string;
  parentId: string | null;
  namespaceId: string;
  isCurrentResource?: boolean;
  onSuccess?: () => void;
}

export function useDeleteResource() {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const deleteResource = async (options: DeleteResourceOptions) => {
    const {
      id,
      parentId,
      namespaceId,
      isCurrentResource = false,
      onSuccess,
    } = options;

    await http.delete(`/namespaces/${namespaceId}/resources/${id}`);

    app.fire('delete_resource', id, parentId);

    app.fire('trash_updated');

    if (isCurrentResource) {
      if (parentId) {
        navigate(`/${namespaceId}/${parentId}`);
      } else {
        navigate(`/${namespaceId}`);
      }
    }

    toast(t('resource.moved_to_trash'), {
      action: {
        label: t('undo'),
        onClick: () => {
          http
            .post(`/namespaces/${namespaceId}/resources/${id}/restore`)
            .then(response => {
              app.fire('generate_resource', parentId, response);
              app.fire('trash_updated');
            });
        },
      },
    });

    onSuccess?.();
  };

  return { deleteResource };
}

export default useDeleteResource;
