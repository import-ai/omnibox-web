export default function extension() {
  if (location.search === '?from=extension') {
    const token = localStorage.getItem('token');
    if (token) {
      document.body.setAttribute('data-token', token);
      return Promise.resolve(false);
    }
  }
  return Promise.resolve(true);
}
