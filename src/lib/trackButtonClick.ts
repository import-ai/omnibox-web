import { track } from '@/lib/sendTrackEvent';

/** Feature area. The first segment of a button click name. */
const BUTTON_TRACK_MODULES = [
  'invite_referral',
  'local_runtime',
  'notification',
  'copilot',
  'resource',
  'settings',
  'sidebar',
  'search',
  'oauth',
  'share',
  'trash',
  'chat',
  'user',
] as const;

/** Click action. The last segment of a button click name. */
const BUTTON_TRACK_ACTIONS = [
  'collapse',
  'navigate',
  'download',
  'refresh',
  'confirm',
  'expand',
  'remove',
  'select',
  'cancel',
  'create',
  'delete',
  'submit',
  'upgrade',
  'toggle',
  'upload',
  'close',
  'retry',
  'copy',
  'edit',
  'open',
  'save',
  'send',
] as const;

const OBJECT_NAME = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

export type ButtonTrackProps = Record<
  string,
  string | number | boolean | undefined
>;

/**
 * `name` is `module_object_action`, for example `chat_message_send`.
 * Product buttons pass it as `trackName`. Native buttons call this directly.
 */
/** Clicking the blank area outside a dialog, menu, or popover. */
export function onOverlayClose(name: string, target: string) {
  return (event: { defaultPrevented: boolean }) => {
    if (event.defaultPrevented) return;
    trackButtonClick(name, { dismiss: 'outside', target });
  };
}

export function overlayCloseName(
  sourceTrackName: string | undefined,
  fallbackModule: (typeof BUTTON_TRACK_MODULES)[number]
) {
  const moduleName =
    BUTTON_TRACK_MODULES.find(item =>
      sourceTrackName?.startsWith(`${item}_`)
    ) ?? fallbackModule;
  return `${moduleName}_overlay_close`;
}

export function trackButtonClick(name: string, props?: ButtonTrackProps) {
  if (process.env.NODE_ENV !== 'production' && !isButtonTrackName(name)) {
    console.warn(
      `[button_click] "${name}" should look like module_object_action`
    );
  }

  void Promise.resolve(
    track('button_click', {
      ...props,
      name,
    })
  ).catch(() => undefined);
}

export function isButtonTrackName(name: string) {
  const moduleName = BUTTON_TRACK_MODULES.find(item =>
    name.startsWith(`${item}_`)
  );
  const action = BUTTON_TRACK_ACTIONS.find(item => name.endsWith(`_${item}`));
  if (!moduleName || !action) {
    return false;
  }

  const objectName = name.slice(
    moduleName.length + 1,
    name.length - action.length - 1
  );
  return OBJECT_NAME.test(objectName);
}
