import { Resource } from '@/interface';
import { formatDistanceToNow } from 'date-fns';

export function getTime(resource: Resource | null) {
  if (!resource) {
    return '';
  }
  if (resource.updatedAt) {
    return (
      'Updated ' +
      formatDistanceToNow(new Date(resource.updatedAt), { addSuffix: true })
    );
  }
  if (resource.createdAt) {
    return (
      'Created ' +
      formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })
    );
  }
  return '';
}
