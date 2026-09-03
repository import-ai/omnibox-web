import type { Option } from '@/components/multiple-selector';
import type { Group, Member } from '@/interface';
import isEmail from '@/lib/isEmail';

import type { ResourcePermissionsData } from './useResourcePermissions';

export interface RecipientOption extends Option {
  recipient_type: 'member' | 'group' | 'email' | 'group_title';
  recipient_id?: string;
  raw_value: string;
}

export function createManualOption(value: string): RecipientOption {
  const rawValue = value.trim();
  const email = isEmail(rawValue);
  return {
    value: `${email ? 'email' : 'group-title'}:${rawValue.toLowerCase()}`,
    label: rawValue,
    recipient_type: email ? 'email' : 'group_title',
    raw_value: rawValue,
  };
}

export function appendUnique(
  current: RecipientOption[],
  additions: RecipientOption[]
): RecipientOption[] {
  const seen = new Set(current.map(item => item.value));
  return additions.reduce<RecipientOption[]>(
    (result, item) => {
      if (!seen.has(item.value)) {
        seen.add(item.value);
        result.push(item);
      }
      return result;
    },
    [...current]
  );
}

export function parseRecipientInput(
  value: string,
  options: RecipientOption[]
): RecipientOption[] {
  const recipients = value
    .split(/，|,/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const existingOption = options.find(option => option.label === item);
      return existingOption || createManualOption(item);
    });
  return appendUnique([], recipients);
}

export function replaceLastRecipientInput(
  value: string,
  label: string
): string {
  const parts = value.split(/，|,/).map(item => item.trim());
  if (parts.length === 0) {
    return label;
  }
  parts[parts.length - 1] = label;
  return parts.filter(Boolean).join(', ');
}

export function buildRecipientOptions(
  members: Member[],
  groups: Group[],
  permissions: ResourcePermissionsData
): RecipientOption[] {
  const existingUserIds = new Set(
    permissions.users.map(item => item.user?.id).filter(Boolean)
  );
  const existingGroupIds = new Set(
    permissions.groups.map(item => item.group?.id).filter(Boolean)
  );

  const availableGroups = permissions.current_role === 'member' ? [] : groups;

  return [
    ...members
      .filter(member => member.user_id && !existingUserIds.has(member.user_id))
      .map(member => ({
        value: `member:${member.user_id}`,
        label: member.email
          ? `${member.username || member.email} (${member.email})`
          : member.username,
        recipient_type: 'member' as const,
        recipient_id: member.user_id,
        raw_value: member.user_id,
      })),
    ...availableGroups
      .filter(group => group.id && !existingGroupIds.has(group.id))
      .map(group => ({
        value: `group:${group.id}`,
        label: group.title,
        recipient_type: 'group' as const,
        recipient_id: group.id,
        raw_value: group.title,
      })),
  ];
}
