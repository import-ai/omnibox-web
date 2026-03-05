import { Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Attributes from '@/components/attributes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Resource } from '@/interface';
import { downloadFile } from '@/lib/download-file';
import Editor from '@/page/resource/editor';
import Folder from '@/page/resource/folder';
import Render from '@/page/resource/render';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function Page(props: IProps) {
  const { editPage, resource, onResource, namespaceId } = props;
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  if (editPage) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
      />
    );
  }

  return (
    <>
      <h1 className="text-4xl font-bold mb-4 break-words">
        {resource.name || t('untitled')}

        {/* Link type - Open link */}
        {resource.resource_type === 'link' && resource.attrs?.url && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={resource.attrs.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center ml-1 p-1 rounded-md text-neutral-400 dark:text-neutral-400"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{resource.attrs.url}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* File type - Download file */}
        {resource.resource_type === 'file' && resource.attrs?.original_name && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled={downloading}
                  onClick={() => {
                    setDownloading(true);
                    downloadFile(
                      namespaceId,
                      resource.id,
                      resource.attrs?.original_name
                    ).finally(() => setDownloading(false));
                  }}
                  className="inline-flex items-center ml-1 p-1 rounded-md text-neutral-400 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{resource.attrs.original_name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </h1>
      <Attributes
        namespaceId={namespaceId}
        resource={resource}
        onResource={onResource}
      />
      {resource.resource_type === 'folder' ? (
        <Folder
          resourceId={resource.id}
          apiPrefix={`/namespaces/${namespaceId}/resources`}
          navigationPrefix={`/${namespaceId}`}
        />
      ) : (
        <Render
          resource={resource}
          linkBase={resource.id}
          style={{ overflow: 'inherit' }}
        />
      )}
    </>
  );
}
