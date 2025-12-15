import { format } from 'date-fns';
import { Clock, File, Link } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Metadata } from '@/components/attributes/metadata.tsx';
import { Button } from '@/components/button';
import ResourceTasks from '@/components/resource-tasks';
import Tag from '@/components/tags';
import { Resource } from '@/interface';
import { downloadFile } from '@/lib/download-file';

interface IProps {
  resource: Resource;
  namespaceId: string;
  onResource?: (resource: Resource) => void;
}

export default function Attributes(props: IProps) {
  const { resource, namespaceId, onResource } = props;
  const { t } = useTranslation();
  const [download, onDownload] = useState(false);

  if (
    resource.resource_type === 'link' &&
    resource.attrs &&
    resource.attrs.url
  ) {
    return (
      <div className="space-y-2 mt-2 mb-6 text-sm">
        <Tag
          data={resource.tags}
          resourceId={resource.id}
          namespaceId={namespaceId}
        />
        <div className="flex flex-wrap sm:flex-nowrap items-start gap-3">
          <Link className="shrink-0 size-4 text-[#8F959E]" />
          <span className="text-[#8F959E] min-w-[80px]">
            {t('resource.attrs.url')}
          </span>
          <a
            target="_blank"
            href={resource.attrs.url}
            className="max-w-[200px] sm:max-w-full break-all text-[#585D65] dark:text-white truncate"
          >
            {resource.attrs.url}
          </a>
        </div>
        {resource.created_at && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Clock className="size-4 text-[#8F959E]" />
            <span className="text-[#8F959E] min-w-[80px]">
              {t('resource.attrs.created')}
            </span>
            <span className="text-[#585D65] dark:text-white">
              {format(resource.created_at, 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </div>
        )}
        {onResource && (
          <ResourceTasks
            resource={resource}
            namespaceId={namespaceId}
            onResource={onResource}
          />
        )}
        {resource.attrs?.metadata && (
          <Metadata metadata={resource.attrs.metadata}></Metadata>
        )}
      </div>
    );
  }

  if (resource.resource_type === 'file' && resource.attrs?.original_name) {
    return (
      <div className="space-y-2 mt-2 mb-6 text-sm">
        <Tag
          data={resource.tags}
          resourceId={resource.id}
          namespaceId={namespaceId}
        />
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <File className="size-4 text-[#8F959E]" />
          <span className="text-[#8F959E] min-w-[80px]">
            {t('resource.attrs.filename')}
          </span>
          <Button
            variant="ghost"
            loading={download}
            className="font-normal ml-[-16px]"
            onClick={() => {
              onDownload(true);
              downloadFile(
                namespaceId,
                resource.id,
                resource.attrs?.original_name
              ).finally(() => {
                onDownload(false);
              });
            }}
          >
            {resource.attrs.original_name}
          </Button>
        </div>
        {resource.created_at && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Clock className="size-4 text-[#8F959E]" />
            <span className="text-[#8F959E] min-w-[80px]">
              {t('resource.attrs.created')}
            </span>
            <span className="text-[#585D65] dark:text-white">
              {format(resource.created_at, 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </div>
        )}
        {onResource && (
          <ResourceTasks
            resource={resource}
            namespaceId={namespaceId}
            onResource={onResource}
          />
        )}
        {resource.attrs?.metadata && (
          <Metadata metadata={resource.attrs.metadata} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2 mb-6 text-sm">
      <Tag
        data={resource.tags}
        resourceId={resource.id}
        namespaceId={namespaceId}
      />
      {resource.created_at && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <Clock className="size-4 text-[#8F959E]" />
          <span className="text-[#8F959E] min-w-[80px]">
            {t('resource.attrs.created')}
          </span>
          <span className="text-[#585D65] dark:text-white">
            {format(resource.created_at, 'yyyy-MM-dd HH:mm:ss')}
          </span>
        </div>
      )}
      {onResource && (
        <ResourceTasks
          resource={resource}
          namespaceId={namespaceId}
          onResource={onResource}
        />
      )}
      {resource.attrs?.metadata && (
        <Metadata metadata={resource.attrs.metadata}></Metadata>
      )}
    </div>
  );
}
