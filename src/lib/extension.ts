export default function extension() {
  if (!document.body.hasAttribute('data-from-extension')) {
    return Promise.resolve(true);
  }
  const token = localStorage.getItem('token');
  if (token) {
    document.body.setAttribute('data-token', token);
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}
