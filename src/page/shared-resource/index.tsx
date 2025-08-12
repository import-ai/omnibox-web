import axios, { CancelTokenSource } from 'axios';
import { t } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import Loading from '@/components/loading';
import useWide from '@/hooks/use-wide';
import { SharedResource, ShareInfo } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import Render from '../resource/render';
import { Password } from './password';

interface SharedResourcePageProps {
  shareInfo: ShareInfo | null;
}

export default function SharedResourcePage(props: SharedResourcePageProps) {
  const { shareInfo } = props;
  const { wide } = useWide();

  const cancelTokenSource = useRef<CancelTokenSource>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [resource, setResource] = useState<SharedResource | null>(null);

  const refetchResource = (password?: string) => {
    if (!shareInfo) {
      setResource(null);
      return;
    }
    if (cancelTokenSource.current) {
      cancelTokenSource.current.cancel('Canceled due to new request.');
    }
    cancelTokenSource.current = axios.CancelToken.source();
    setLoading(true);
    http
      .get(`/shares/${shareInfo.id}/resources/${shareInfo.resource_id}`, {
        cancelToken: cancelTokenSource.current.token,
        headers: password ? { 'X-OmniBox-Share-Password': password } : {},
      })
      .then(data => {
        setResource(data);
      })
      .catch(err => {
        if (err && err.status && err.status === 403) {
          toast.error(t('shared_resources.incorrect_password'));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!shareInfo?.password_enabled) {
      return refetchResource();
    }
  }, [shareInfo]);

  const handlePassword = (password: string) => {
    refetchResource(password);
  };

  if (resource && !loading) {
    return (
      <div className="flex justify-center h-full p-4">
        <div
          className={cn('flex flex-col w-full h-full', {
            'max-w-3xl': !wide,
          })}
        >
          <h1 className="text-4xl font-bold mb-4">
            {resource.name || t('untitled')}
          </h1>
          <Render resource={resource} />
        </div>
      </div>
    );
  }
  if (shareInfo?.password_enabled && !loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="flex flex-col gap-4 w-[400px]">
          <span className="text-sm">
            {t('shared_resources.password_required')}
          </span>
          <Password onPassword={handlePassword} />
        </div>
      </div>
    );
  }
  return <Loading />;
}
