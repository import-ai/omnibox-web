import { http } from '@/lib/request';
import { Namespace } from '@/interface';

export function getNamespace(
  defaultValue: null | Namespace = {
    id: '--',
    name: '--',
    collaborators: [],
    owner_id: [],
  },
) {
  const cache = localStorage.getItem('namespace');
  const namespace = cache ? JSON.parse(cache) : defaultValue;
  return namespace;
}

export function initNamespace() {
  const namespace = getNamespace(null);
  return (
    namespace
      ? Promise.resolve(namespace)
      : http.get('namespaces/user').then((data) => data[0])
  )
    .then((data) => {
      if (namespace) {
        return Promise.resolve(null);
      } else {
        localStorage.setItem('namespace', JSON.stringify(data));
        return Promise.resolve(true);
      }
    })
    .catch((err) => {
      if (err.status === 404) {
        localStorage.removeItem('uid');
        localStorage.removeItem('token');
        localStorage.removeItem('namespace');
        return Promise.resolve(false);
      }
    });
}

export function createNamespace(name: string) {
  return http.post('namespaces', { name }).then((data) => {
    localStorage.setItem('namespace', JSON.stringify(data));
    return Promise.resolve(data);
  });
}
