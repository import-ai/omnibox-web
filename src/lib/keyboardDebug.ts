import { resolveLayoutKeyboardOcclusion } from './visualViewport';

const DEBUG_FLAG = 'kbdebug';
const LOG_LIMIT = 8;

/**
 * In-app WebViews report the on-screen keyboard in different ways and cannot be
 * inspected with devtools, so `?kbdebug=1` pins the live viewport numbers and
 * the focus events on screen.
 */
export function isKeyboardDebugRequested(search: string): boolean {
  return new URLSearchParams(search).get(DEBUG_FLAG) === '1';
}

export function formatKeyboardDebugReport(input: {
  innerHeight: number;
  layoutBaseline: number;
  visualHeight: number | null;
  visualOffsetTop: number | null;
  appHeight: string;
  keyboardClasses: string;
  activeElement: string;
  log: string[];
}): string {
  const visual =
    input.visualHeight === null
      ? 'visualViewport: missing'
      : `vv: ${Math.round(input.visualHeight)} top ${Math.round(
          input.visualOffsetTop ?? 0
        )}`;
  return [
    `inner: ${input.innerHeight} base: ${input.layoutBaseline}`,
    visual,
    `app: ${input.appHeight || '-'} layoutOcclusion: ${resolveLayoutKeyboardOcclusion(
      input.layoutBaseline,
      input.innerHeight,
      input.visualHeight
    )}`,
    `[${input.keyboardClasses || '-'}]`,
    `active: ${input.activeElement}`,
    ...input.log,
  ].join('\n');
}

function describeActiveElement(element: Element | null): string {
  if (!element || element === document.body) {
    return 'none';
  }
  return element.tagName.toLowerCase();
}

function readKeyboardClasses(root: HTMLElement): string {
  return ['keyboard-open', 'keyboard-dismissing']
    .filter(name => root.classList.contains(name))
    .join(' ');
}

export function bindKeyboardDebug(win: Window = window): () => void {
  if (!isKeyboardDebugRequested(win.location.search)) {
    return () => {};
  }

  const root = win.document.documentElement;
  const panel = win.document.createElement('pre');
  panel.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'z-index:2147483647',
    'margin:0',
    'padding:4px 6px',
    'max-width:70vw',
    'font:10px/1.35 ui-monospace,monospace',
    'white-space:pre-wrap',
    'color:#fff',
    'background:rgba(0,0,0,.72)',
    'pointer-events:none',
  ].join(';');
  win.document.body.appendChild(panel);

  let layoutBaseline = win.innerHeight;
  const log: string[] = [];

  const render = () => {
    layoutBaseline = Math.max(layoutBaseline, win.innerHeight);
    const appHeight = root.style.getPropertyValue('--app-height');
    panel.textContent = formatKeyboardDebugReport({
      innerHeight: win.innerHeight,
      layoutBaseline,
      visualHeight: win.visualViewport?.height ?? null,
      visualOffsetTop: win.visualViewport?.offsetTop ?? null,
      appHeight,
      keyboardClasses: readKeyboardClasses(root),
      activeElement: describeActiveElement(win.document.activeElement),
      log: [...log],
    });
  };

  const note = (event: string) => {
    log.unshift(
      `${new Date().toLocaleTimeString('en-GB')} ${event} inner ${
        win.innerHeight
      } vv ${Math.round(win.visualViewport?.height ?? 0)} app ${
        root.style.getPropertyValue('--app-height') || '-'
      }`
    );
    log.length = Math.min(log.length, LOG_LIMIT);
    render();
  };

  const onFocusIn = () => note('focusin');
  const onFocusOut = () => note('focusout');
  const onResize = () => note('resize');
  const onVisualResize = () => note('vv-resize');
  const onVisualScroll = () => render();

  win.document.addEventListener('focusin', onFocusIn);
  win.document.addEventListener('focusout', onFocusOut);
  win.addEventListener('resize', onResize);
  win.visualViewport?.addEventListener('resize', onVisualResize);
  win.visualViewport?.addEventListener('scroll', onVisualScroll);
  const frameTimer = win.setInterval(render, 250);
  render();

  return () => {
    win.clearInterval(frameTimer);
    win.document.removeEventListener('focusin', onFocusIn);
    win.document.removeEventListener('focusout', onFocusOut);
    win.removeEventListener('resize', onResize);
    win.visualViewport?.removeEventListener('resize', onVisualResize);
    win.visualViewport?.removeEventListener('scroll', onVisualScroll);
    panel.remove();
  };
}
