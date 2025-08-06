import { format } from 'date-fns';
import { useState } from 'react';
import Tag from '@/components/tags';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { Button } from '@/components/button';
import { useTranslation } from 'react-i18next';
import { Clock, Link, File } from 'lucide-react';

interface IProps {
  resource: Resource;
  namespaceId: string;
}

export default function Attributes(props: IProps) {
  const { resource, namespaceId } = props;
  const { t } = useTranslation();
  const [download, onDownload] = useState(false);

  if (
    resource.resource_type === 'link' &&
    resource.attrs &&
    resource.attrs.url
  ) {
    return (
      <div className="space-y-2 mt-2 mb-6 text-base">
        <Tag
          data={resource.tags}
          resourceId={resource.id}
          namespaceId={namespaceId}
        />
        <div className="flex items-center gap-3">
          <Link className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground font-medium min-w-[80px]">
            {t('resource.attrs.url')}
          </span>
          <a
            target="_blank"
            href={resource.attrs.url}
            className="text-base text-foreground"
          >
            {resource.attrs.url}
          </a>
        </div>
        {/* {resource.user && (
          <div className="flex items-center gap-3">
            <User2 className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium min-w-[80px]">
              {t('resource.attrs.author')}
            </span>
            <span className="text-foreground">
              {resource.user.username}&lt;{resource.user.email}&gt;
            </span>
          </div>
        )} */}
        {resource.created_at && (
          <div className="flex items-center gap-3">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium min-w-[80px]">
              {t('resource.attrs.created')}
            </span>
            <span className="text-foreground">
              {format(resource.created_at, 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (resource.attrs && resource.attrs.url && resource.attrs.original_name) {
    return (
      <div className="space-y-2 mt-2 mb-6 text-base">
        <Tag
          data={resource.tags}
          resourceId={resource.id}
          namespaceId={namespaceId}
        />
        <div className="flex items-center gap-3">
          <File className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground font-medium min-w-[80px]">
            {t('resource.attrs.filename')}
          </span>
          <Button
            variant="ghost"
            loading={download}
            className="text-base font-normal ml-[-16px]"
            onClick={() => {
              onDownload(true);
              http
                .get(
                  `/namespaces/${namespaceId}/resources/files/${resource.id}`,
                  {
                    responseType: 'blob',
                  }
                )
                .then(blob => {
                  const link = document.createElement('a');
                  const url = window.URL.createObjectURL(blob);
                  link.href = url;
                  link.target = '_blank';
                  if (resource.attrs && resource.attrs.original_name) {
                    link.download = decodeURI(resource.attrs.original_name);
                  }
                  link.style.display = 'none';
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                })
                .finally(() => {
                  onDownload(false);
                });
            }}
          >
            {resource.attrs.original_name}
          </Button>
        </div>
        {resource.created_at && (
          <div className="flex items-center gap-3">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium min-w-[80px]">
              {t('resource.attrs.created')}
            </span>
            <span className="text-foreground">
              {format(resource.created_at, 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2 mb-6 text-base">
      <Tag
        data={resource.tags}
        resourceId={resource.id}
        namespaceId={namespaceId}
      />
      {/* {resource.user && (
        <div className="flex items-center gap-3">
          <User2 className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground font-medium min-w-[80px]">
            {t('resource.attrs.author')}
          </span>
          <span className="text-foreground">
            {resource.user.username}&lt;{resource.user.email}&gt;
          </span>
        </div>
      )} */}
      {resource.created_at && (
        <div className="flex items-center gap-3">
          <Clock className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground font-medium min-w-[80px]">
            {t('resource.attrs.created')}
          </span>
          <span className="text-foreground">
            {format(resource.created_at, 'yyyy-MM-dd HH:mm:ss')}
          </span>
        </div>
      )}
    </div>
  );
}
