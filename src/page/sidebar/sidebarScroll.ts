/** Center a sidebar row inside the sidebar content scroller when possible. */
export function centerSidebarElementOnce(selector: string): boolean {
  const element = document.querySelector(selector);
  if (!element) return false;

  const container = element.closest<HTMLElement>('[data-sidebar="content"]');
  if (container) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollTop +=
      elementRect.top -
      containerRect.top -
      (container.clientHeight - elementRect.height) / 2;
  } else {
    element.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  return true;
}
