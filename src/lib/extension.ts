export default function extension() {
  if (location.search !== '?from=extension') {
    return Promise.resolve(false);
  }
  const token = localStorage.getItem('token');
  if (token) {
    document.body.setAttribute('data-token', token);
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}
