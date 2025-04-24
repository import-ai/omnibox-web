import { http } from '@/utils/request';
import { NavigateFunction, NavigateOptions } from 'react-router-dom';

export function toDefaultNamespace(
  navigate: NavigateFunction,
  opts?: NavigateOptions
) {
  const cache = localStorage.getItem('namespace');
  const namespace = cache ? JSON.parse(cache) : null;
  (namespace
    ? http.get(`namespaces/${namespace.id}`)
    : http.get('namespaces/user').then((data) => data[0])
  )
    .then((data) => {
      localStorage.setItem('namespace', JSON.stringify(data));
      navigate(`/${data.id}`, opts);
    })
    .catch((err) => {
      if (err.status === 404) {
        localStorage.removeItem('uid');
        localStorage.removeItem('token');
        localStorage.removeItem('namespace');
        navigate('/user/login', { replace: true });
      }
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
      localStorage.setItem('namespace', JSON.stringify(data));
      return Promise.resolve(data);
    });
  });
}
