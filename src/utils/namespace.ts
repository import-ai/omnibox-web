import { http } from '@/utils/request';
import { NavigateFunction, NavigateOptions } from 'react-router-dom';

export function toDefaultNamespace(
  navigate: NavigateFunction,
  opts?: NavigateOptions
) {
  const namespace = localStorage.getItem('namespace');
  (namespace
    ? Promise.resolve(namespace)
    : http.get('namespaces/user').then((data) => data[0].id)
  ).then((data) => {
    !namespace && localStorage.setItem('namespace', data);
    navigate(`/${data}`, opts);
  });
}

export function createNamespace(name: string) {
  return http.post('namespaces', { name }).then((data) => {
    const rootParams = {
      resourceType: 'folder',
      namespace: data.id,
    };
    return Promise.all([
      http.post('resources', {
        ...rootParams,
        spaceType: 'private',
      }),
      http.post('resources', {
        ...rootParams,
        spaceType: 'teamspace',
      }),
    ]).then(() => {
      localStorage.setItem('namespace', data.id);
      return Promise.resolve(data);
    });
  });
}
