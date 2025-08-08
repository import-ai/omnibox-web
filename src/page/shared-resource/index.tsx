import Loading from '@/components/loading';
import { SharedResource } from '@/interface';
import { http } from '@/lib/request';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Render from '../resource/render';
import { cn } from '@/lib/utils';
import useWide from '@/hooks/use-wide';

export default function SharedResourcePage() {
  const { wide } = useWide();
  const params = useParams();
  const shareId = params.share_id;
  const resourceId = params.resource_id;

  const [resource, setResource] = useState<SharedResource | null>(null);

  useEffect(() => {
    setResource(null);
    const source = axios.CancelToken.source();
    http
      .get(`/shares/${shareId}/resources/${resourceId}`, {
        cancelToken: source.token,
      })
      .then(setResource);
    return () => source.cancel();
  }, [shareId, resourceId]);

  if (!resource) {
    return <Loading />;
  }
  return (
    <div className="flex justify-center h-full p-4">
      <div
        className={cn('flex flex-col w-full h-full', {
          'max-w-3xl': !wide,
        })}
      >
        <Render resource={resource} />
      </div>
    </div>
  );
}
