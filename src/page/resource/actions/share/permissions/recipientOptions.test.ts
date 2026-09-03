import { Group, Member } from '@/interface';

import {
  buildRecipientOptions,
  createManualOption,
  parseRecipientInput,
  replaceLastRecipientInput,
} from './recipientOptions';
import type { ResourcePermissionsData } from './useResourcePermissions';

const emptyPermissions: ResourcePermissionsData = {
  global_permission: 'full_access',
  users: [],
  groups: [],
  current_permission: 'full_access',
  current_role: 'member',
};

const members: Member[] = [
  {
    id: 'member-row-1',
    user_id: 'user-1',
    username: 'Alice',
    email: 'alice@example.com',
    role: 'member',
    permission: 'full_access',
  },
  {
    id: 'member-row-2',
    user_id: 'user-2',
    username: 'Bob',
    email: 'bob@example.com',
    role: 'member',
    permission: 'full_access',
  },
];

const groups: Group[] = [
  { id: 'group-1', title: 'Editors' },
  { id: 'group-2', title: 'Readers' },
];

describe('recipient options', () => {
  it('returns all members and groups except entries already in permissions', () => {
    const options = buildRecipientOptions(members, groups, {
      ...emptyPermissions,
      current_role: 'owner',
      users: [{ user: { id: 'user-1' } as any, permission: 'full_access' }],
      groups: [{ group: { id: 'group-1' } as any, permission: 'can_view' }],
    });

    expect(options.map(option => option.value)).toEqual([
      'member:user-2',
      'group:group-2',
    ]);
  });

  it('does not expose group options to members', () => {
    const options = buildRecipientOptions(members, groups, {
      ...emptyPermissions,
      current_role: 'member',
    });

    expect(options.map(option => option.value)).toEqual([
      'member:user-1',
      'member:user-2',
    ]);
  });

  it('classifies manually entered emails and group names', () => {
    expect(createManualOption('Alice@example.com')).toMatchObject({
      recipient_type: 'email',
      raw_value: 'Alice@example.com',
    });
    expect(createManualOption('Existing Group')).toMatchObject({
      recipient_type: 'group_title',
      raw_value: 'Existing Group',
    });
  });

  it('maps selected dropdown labels back to existing recipients', () => {
    const options = buildRecipientOptions(members, groups, {
      ...emptyPermissions,
      current_role: 'owner',
    });

    expect(parseRecipientInput('Editors, guest@example.com', options)).toEqual([
      expect.objectContaining({
        recipient_type: 'group',
        recipient_id: 'group-1',
      }),
      expect.objectContaining({
        recipient_type: 'email',
        raw_value: 'guest@example.com',
      }),
    ]);
  });

  it('replaces the active comma-separated input segment', () => {
    expect(replaceLastRecipientInput('tes', 'test2')).toBe('test2');
    expect(replaceLastRecipientInput('first, tes', 'test2')).toBe(
      'first, test2'
    );
    expect(replaceLastRecipientInput('first, ', 'test2')).toBe('first, test2');
  });
});
