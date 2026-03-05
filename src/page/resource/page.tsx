import { Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [isOverflow, setIsOverflow] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let rafId: number;
    const checkOverflow = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setIsOverflow(el.scrollHeight > el.clientHeight);
      });
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [resource.name]);

  if (editPage) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
      />
    );
  }

  const renderIcon = () => (
    <>
      {/* Link type - Open link */}
      {resource.resource_type === 'link' && resource.attrs?.url && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={resource.attrs.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center p-1 rounded-md text-neutral-400 dark:text-neutral-400"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>{resource.attrs.url}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* File type - Download file */}
      {resource.resource_type === 'file' && resource.attrs?.original_name && (
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
              className="inline-flex items-center p-1 rounded-md text-neutral-400 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{resource.attrs.original_name}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <h1 className="text-4xl font-bold mb-4">
              <span className="relative inline-block max-w-full">
                <span
                  ref={textRef}
                  className={`break-words line-clamp-2 ${isOverflow ? 'pr-5' : ''}`}
                >
                  {resource.name || t('untitled')}
                  {!isOverflow && (
                    <span className="inline-block align-middle ml-1">
                      {renderIcon()}
                    </span>
                  )}
                </span>
                {isOverflow && (
                  <span className="absolute bottom-0 right-0 pl-2">
                    {renderIcon()}
                  </span>
                )}
              </span>
            </h1>
          </TooltipTrigger>
          <TooltipContent className="max-w-md break-words">
            <p>{resource.name || t('untitled')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
