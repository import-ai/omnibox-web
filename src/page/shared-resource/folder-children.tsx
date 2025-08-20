import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Loading from '@/components/loading';
import { Separator } from '@/components/ui/separator';
import { SharedResourceMeta } from '@/interface';
import { http } from '@/lib/request';

import { SharedFolderContent } from './shared-folder-content';

interface FolderChildrenProps {
  shareId: string;
  resourceId: string;
}

export default function FolderChildren({
  shareId,
  resourceId,
}: FolderChildrenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [children, setChildren] = useState<SharedResourceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = axios.CancelToken.source();

    http
      .get(`/shares/${shareId}/resources/${resourceId}/children`, {
        cancelToken: source.token,
      })
      .then(data => {
        setChildren(data || []);
        setLoading(false);
      })
      .catch(err => {
        if (!axios.isCancel(err)) {
          setError(t('shared_resources.failed_to_load_children'));
          setLoading(false);
        }
      });

    return () => source.cancel();
  }, [shareId, resourceId, t]);

  const handleItemClick = (child: SharedResourceMeta) => {
    navigate(`/s/${shareId}/${child.id}`);
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="mt-12 text-center text-gray-500">
        {t('no_pages_inside')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {children.map((child, index) => (
        <div
          className="cursor-pointer group"
          key={child.id}
          onClick={() => handleItemClick(child)}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium line-clamp-2 group-hover:text-blue-500">
              {child.name || t('untitled')}
            </h3>
          </div>
          {child.resource_type === 'folder' ? (
            <SharedFolderContent shareId={shareId} resourceId={child.id} />
          ) : (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {/* No timestamp info available from share API */}
            </p>
          )}
          {index < children.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  );
}
