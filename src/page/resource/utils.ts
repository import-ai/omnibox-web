import i18next from 'i18next';
import { Resource } from '@/interface';
import { formatDistanceToNow } from 'date-fns';

export function getTime(resource: Resource | null) {
  if (!resource) {
    return '';
  }
  if (resource.updated_at) {
    return (
      i18next.t('updated') +
      ' ' +
      formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })
    );
  }
  if (resource.created_at) {
    return (
      i18next.t('created') +
      ' ' +
      formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })
    );
  }
  return '';
}
