import { CreatedTimeAttribute } from '@/components/attributes/created';
import { Metadata } from '@/components/attributes/metadata';
import { FilenameAttribute } from '@/components/attributes/name';
import { UrlAttribute } from '@/components/attributes/url';
import Tag from '@/components/tags';
import { Resource } from '@/interface';

import ResourceTasks from './resource-tasks';

interface IProps {
  resource: Resource;
  namespaceId: string;
  onResource?: (resource: Resource) => void;
  readOnly?: boolean;
}

export default function Attributes(props: IProps) {
  const { resource, namespaceId, onResource, readOnly } = props;

  if (
    resource.resource_type === 'link' &&
    resource.attrs &&
    resource.attrs.url
  ) {
    return (
      <div className="space-y-2 mb-6 text-sm">
        <Tag
          data={resource.tags}
          resourceId={resource.id}
          namespaceId={namespaceId}
          readOnly={readOnly}
        />
        <UrlAttribute url={resource.attrs.url} />
        {resource.created_at && (
          <CreatedTimeAttribute createdAt={resource.created_at} />
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

  if (resource.resource_type === 'file' && resource.attrs?.original_name) {
    // On the sharing page (in read-only mode), file attributes are not displayed, only tags and creation time are shown
    if (readOnly) {
      return (
        <div className="space-y-2 mb-6 text-sm">
          <Tag
            data={resource.tags}
            resourceId={resource.id}
            namespaceId={namespaceId}
            readOnly={readOnly}
          />
          {resource.created_at && (
            <CreatedTimeAttribute createdAt={resource.created_at} />
          )}
          {resource.attrs?.metadata && (
            <Metadata metadata={resource.attrs.metadata} />
          )}
        </div>
      );
    }
    return (
      <div className="space-y-2 mb-6 text-sm">
        <Tag
          data={resource.tags}
          resourceId={resource.id}
          namespaceId={namespaceId}
          readOnly={readOnly}
        />
        <FilenameAttribute
          filename={resource.attrs.original_name}
          namespaceId={namespaceId}
          resourceId={resource.id}
        />
        {resource.created_at && (
          <CreatedTimeAttribute createdAt={resource.created_at} />
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
    <div className="space-y-2 mb-6 text-sm">
      <Tag
        data={resource.tags}
        resourceId={resource.id}
        namespaceId={namespaceId}
        readOnly={readOnly}
      />
      {resource.created_at && (
        <CreatedTimeAttribute createdAt={resource.created_at} />
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
