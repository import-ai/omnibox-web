import i18next from 'i18next';
import { Resource } from '@/interface';
import { formatDistanceToNow } from 'date-fns';

export function getTime(resource: Resource | null) {
  if (!resource) {
    return '';
  }
  if (resource.updatedAt) {
    return (
      i18next.t('updated') +
      ' ' +
      formatDistanceToNow(new Date(resource.updatedAt), { addSuffix: true })
    );
  }
  if (resource.createdAt) {
    return (
      i18next.t('created') +
      ' ' +
      formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })
    );
  }
  return '';
}
