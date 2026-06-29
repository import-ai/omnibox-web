import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Resource } from '@/interface';
import type { ProcessedArg } from '@/lib/toolArgs';
import { trimMiddle } from '@/lib/toolArgs';
import { useRootId } from '@/page/sidebar/store';
import { fetchResourcesByIds } from '@/service/resource';
import { fetchShareResource } from '@/service/share';

interface IProps {
  args: ProcessedArg[];
}

/**
 * Renders a tool call's args as chips. Resource-id args resolve to the resource
 * name and become a clickable link; space-root ids render as a non-clickable
 * "Private"/"Teamspace" label. Returns a fragment so callers control the wrapper.
 */
export function ToolCallArgs({ args }: IProps) {
  const { t } = useTranslation();
  const params = useParams();

  // Resolved resource names for resource-id args (id -> name).
  const [resourceNames, setResourceNames] = useState<Record<string, string>>(
    {}
  );
  // Space root ids for the current namespace. A resource-id arg matching one of
  // these is a root and is shown as a non-clickable "Private"/"Teamspace" label
  // instead of a link.
  const privateRootId = useRootId('private');
  const teamspaceRootId = useRootId('teamspace');
  const resourceLinkPrefix = params.share_id
    ? `/s/${params.share_id}`
    : params.namespace_id
      ? `/${params.namespace_id}`
      : '';

  const resourceIdsKey = Array.from(
    new Set(args.map(arg => arg.resourceId).filter((id): id is string => !!id))
  )
    .sort()
    .join(',');

  useEffect(() => {
    const ids = resourceIdsKey ? resourceIdsKey.split(',') : [];
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      let entries: [string, string][] = [];
      if (params.share_id) {
        const shareId = params.share_id;
        const results = await Promise.all(
          ids.map(id =>
            fetchShareResource(shareId, id)
              .then(
                resource =>
                  [id, resource.name || t('untitled')] as [string, string]
              )
              .catch(() => null)
          )
        );
        entries = results.filter((e): e is [string, string] => e !== null);
      } else if (params.namespace_id) {
        const resources: Resource[] = await fetchResourcesByIds(
          params.namespace_id,
          ids
        ).catch(() => []);
        entries = resources.map(resource => [
          resource.id,
          resource.name || t('untitled'),
        ]);
      }
      if (!cancelled && entries.length > 0) {
        setResourceNames(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceIdsKey, params.namespace_id, params.share_id, t]);

  return (
    <>
      {args.map((arg, argIndex) => {
        if (arg.resourceId) {
          const rootSpace =
            arg.resourceId === privateRootId
              ? 'private'
              : arg.resourceId === teamspaceRootId
                ? 'teamspace'
                : undefined;
          if (rootSpace) {
            return (
              <code
                key={'arg_' + argIndex}
                className="bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded text-xs font-mono"
              >
                {t(rootSpace)}
              </code>
            );
          }
        }
        if (arg.resourceId && resourceLinkPrefix) {
          const fullName = resourceNames[arg.resourceId];
          return (
            <a
              key={'arg_' + argIndex}
              href={`${resourceLinkPrefix}/${arg.resourceId}`}
              target="_blank"
              rel="noopener noreferrer"
              title={fullName}
              className="bg-muted text-primary underline underline-offset-2 border border-border px-1.5 py-0.5 rounded text-xs font-mono hover:opacity-80"
            >
              {fullName ? trimMiddle(fullName) : arg.display}
            </a>
          );
        }
        return (
          <code
            key={'arg_' + argIndex}
            className="bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded text-xs font-mono"
          >
            {arg.display}
          </code>
        );
      })}
    </>
  );
}
