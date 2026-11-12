import { track } from '@/lib/sendTrackEvent';

import { isButtonTrackName, trackButtonClick } from './trackButtonClick';

jest.unmock('@/lib/trackButtonClick');
jest.unmock('./trackButtonClick');

jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn() }));

const mockedTrack = jest.mocked(track);

beforeEach(() => {
  mockedTrack.mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('accepts module, object, and action names', () => {
  expect(isButtonTrackName('chat_message_send')).toBe(true);
  expect(isButtonTrackName('share_link_copy')).toBe(true);
  expect(isButtonTrackName('sidebar_namespace_upgrade')).toBe(true);
  expect(isButtonTrackName('settings_api_key_delete')).toBe(true);
  expect(isButtonTrackName('sidebar_panel_expand')).toBe(true);
  expect(isButtonTrackName('user_account_delete')).toBe(true);
  expect(isButtonTrackName('invite_referral_task_select')).toBe(true);
  expect(isButtonTrackName('local_runtime_device_open')).toBe(true);
});

test('rejects names outside the module and action lists', () => {
  expect(isButtonTrackName('chat_message')).toBe(false);
  expect(isButtonTrackName('chat_message_clicked')).toBe(false);
  expect(isButtonTrackName('Chat_message_send')).toBe(false);
  expect(isButtonTrackName('unknown_message_send')).toBe(false);
  expect(isButtonTrackName('chat_send')).toBe(false);
  expect(isButtonTrackName('local_runtime_device_rename')).toBe(false);
});

test('reports a button click with its name and extra fields', () => {
  trackButtonClick('chat_message_send', { resource_type: 'folder' });

  expect(mockedTrack).toHaveBeenCalledWith('button_click', {
    resource_type: 'folder',
    name: 'chat_message_send',
  });
  expect(console.warn).not.toHaveBeenCalled();
});

test('keeps the button name when extra fields also include name', () => {
  trackButtonClick('share_link_copy', { name: 'other' });

  expect(mockedTrack).toHaveBeenCalledWith('button_click', {
    name: 'share_link_copy',
  });
});

test('warns for an unexpected name and still reports the click', () => {
  trackButtonClick('save');

  expect(console.warn).toHaveBeenCalledWith(
    '[button_click] "save" should look like module_object_action'
  );
  expect(mockedTrack).toHaveBeenCalledWith('button_click', { name: 'save' });
});
