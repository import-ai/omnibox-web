import each from '@/lib/each';

export function addReferrerPolicyForElement(target: HTMLElement) {
  const node = target.querySelectorAll('img');
  if (node.length <= 0) {
    return target;
  }
  each(node, item => {
    if (!item.hasAttribute('referrerpolicy')) {
      item.setAttribute('referrerpolicy', 'same-origin');
    }
  });
  return target;
}

export function addReferrerPolicyForString(data: string) {
  if (!data) {
    return data;
  }
  const container = document.createElement('div');
  container.innerHTML = data;
  return addReferrerPolicyForElement(container).innerHTML;
}
