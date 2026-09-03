import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import type { Option } from '@/components/multiple-selector';
import MultipleSelector from '@/components/multiple-selector';
import Actions from '@/components/permission-action/Action';
import { getData } from '@/components/permission-action/data';
import type { Group, Member, Permission } from '@/interface';
import { http } from '@/lib/request';

import type { RecipientOption } from './recipientOptions';
import {
  appendUnique,
  buildRecipientOptions,
  parseRecipientInput,
  replaceLastRecipientInput,
} from './recipientOptions';
import type { ResourcePermissionsData } from './useResourcePermissions';

interface InviteFormProps {
  resource_id: string;
  namespace_id: string;
  permissions: ResourcePermissionsData;
  permissionsLoading: boolean;
  permissionsReady: boolean;
  permissionsError: boolean;
  refetch: () => Promise<void>;
}

export default function InviteForm(props: InviteFormProps) {
  const {
    resource_id,
    namespace_id,
    permissions,
    permissionsLoading,
    permissionsReady,
    permissionsError,
    refetch,
  } = props;
  const { t } = useTranslation();
  const data = getData(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientsReady, setRecipientsReady] = useState(false);
  const [recipientsError, setRecipientsError] = useState(false);
  const [recipientsRetry, setRecipientsRetry] = useState(0);
  const [selectedRecipients, setSelectedRecipients] = useState<
    RecipientOption[]
  >([]);
  const [permission, setPermission] = useState<Permission>('full_access');

  useEffect(() => {
    let active = true;
    setRecipientsError(false);

    if (!namespace_id || !permissionsReady) {
      setRecipientsLoading(false);
      setRecipientsReady(!namespace_id && permissionsReady);
      return () => {
        active = false;
      };
    }

    setRecipientsLoading(true);
    setRecipientsReady(false);
    const loadRecipients = async () => {
      try {
        const [memberResult, groupResult] = await Promise.allSettled([
          http.get<Member[]>(`namespaces/${namespace_id}/members`, {
            mute: true,
          }),
          permissions.current_role === 'member'
            ? Promise.resolve([] as Group[])
            : http.get<Group[]>(`namespaces/${namespace_id}/groups`, {
                mute: true,
              }),
        ]);

        if (!active) {
          return;
        }
        setMembers(
          memberResult.status === 'fulfilled' &&
            Array.isArray(memberResult.value)
            ? memberResult.value
            : []
        );
        setGroups(
          groupResult.status === 'fulfilled' && Array.isArray(groupResult.value)
            ? groupResult.value
            : []
        );
        const ready =
          memberResult.status === 'fulfilled' &&
          Array.isArray(memberResult.value) &&
          groupResult.status === 'fulfilled' &&
          Array.isArray(groupResult.value);
        setRecipientsReady(ready);
        setRecipientsError(!ready);
      } finally {
        if (active) {
          setRecipientsLoading(false);
        }
      }
    };

    if (namespace_id) {
      void loadRecipients();
    } else {
      setRecipientsLoading(false);
    }
    return () => {
      active = false;
    };
  }, [
    namespace_id,
    permissions.current_role,
    permissionsReady,
    recipientsRetry,
  ]);

  useEffect(() => {
    setInputValue('');
    setSelectedRecipients([]);
  }, [namespace_id, resource_id]);

  const options = useMemo(
    () => buildRecipientOptions(members, groups, permissions),
    [groups, members, permissions]
  );

  const handleInputValueChange = (value: string) => {
    setInputValue(value);
    const labels = new Set(
      value
        .split(/，|,/)
        .map(item => item.trim())
        .filter(Boolean)
    );
    setSelectedRecipients(current =>
      current.filter(option => labels.has(option.label))
    );
  };

  const handleRecipientChange = (selected: Option[]) => {
    const option = selected[selected.length - 1] as RecipientOption | undefined;
    if (!option) {
      return;
    }
    setSelectedRecipients(current => appendUnique(current, [option]));
    setInputValue(current => replaceLastRecipientInput(current, option.label));
  };

  const handleSubmit = async () => {
    const allRecipients = parseRecipientInput(inputValue, [
      ...selectedRecipients,
      ...options,
    ]);
    const memberIds = allRecipients
      .filter(item => item.recipient_type === 'member')
      .map(item => item.recipient_id)
      .filter((id): id is string => Boolean(id));
    const groupIds = allRecipients
      .filter(item => item.recipient_type === 'group')
      .map(item => item.recipient_id)
      .filter((id): id is string => Boolean(id));
    const userEmails = allRecipients
      .filter(item => item.recipient_type === 'email')
      .map(item => item.raw_value);
    const groupTitles = allRecipients
      .filter(item => item.recipient_type === 'group_title')
      .map(item => item.raw_value);

    if (
      memberIds.length === 0 &&
      groupIds.length === 0 &&
      userEmails.length === 0 &&
      groupTitles.length === 0
    ) {
      return;
    }

    setLoading(true);
    try {
      const requests = [
        ...memberIds.map(userId =>
          http.patch(
            `namespaces/${namespace_id}/resources/${resource_id}/permissions/users/${userId}`,
            { permission }
          )
        ),
        ...groupIds.map(groupId =>
          http.patch(
            `namespaces/${namespace_id}/resources/${resource_id}/permissions/groups/${groupId}`,
            { permission }
          )
        ),
        ...(userEmails.length > 0 || groupTitles.length > 0
          ? [
              http.post('invite', {
                groupTitles,
                role: 'member',
                emails: userEmails,
                resourceId: resource_id,
                namespace: namespace_id,
                permission,
                inviteUrl: `${location.origin}/invite/confirm`,
                registerUrl: `${location.origin}/user/accept-invite`,
                inviteType: 'share',
              }),
            ]
          : []),
      ];
      const results = await Promise.allSettled(requests);
      await refetch();
      if (results.some(result => result.status === 'rejected')) {
        return;
      }
      setInputValue('');
      setSelectedRecipients([]);
      toast.success(t('share.permissions.invite_success'), {
        position: 'bottom-right',
      });
    } catch {
      // The request interceptor already displays the server error message.
    } finally {
      setLoading(false);
    }
  };

  const visible = inputValue.trim().length > 0;
  const optionsReady =
    permissionsReady &&
    !permissionsLoading &&
    recipientsReady &&
    !recipientsLoading;
  const loadError = permissionsError || recipientsError;
  const loadErrorMessage = permissionsError
    ? t('share.permissions.permissions_load_failed')
    : t('share.permissions.recipients_load_failed');
  const handleRetry = () => {
    if (permissionsError) {
      void refetch().catch(() => undefined);
    }
    if (recipientsError) {
      setRecipientsRetry(value => value + 1);
    }
  };

  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <MultipleSelector
          onChange={handleRecipientChange}
          options={optionsReady ? options : []}
          inputValue={inputValue}
          placeholder={t('share.permissions.invite_placeholder')}
          clearInputOnSelect={false}
          resetOnSelect
          nativeInput
          emptyIndicator={
            optionsReady
              ? t('share.permissions.no_recipients')
              : loadError
                ? loadErrorMessage
                : undefined
          }
          inputProps={{
            className: 'pr-24 select-text',
            'aria-label': t('share.permissions.invite_placeholder'),
            onValueChange: handleInputValueChange,
          }}
          hideClearAllButton
          className="min-h-[34px] py-0"
        />
        {loadError && (
          <div className="mt-1 flex items-center justify-between text-xs text-destructive">
            <span>{loadErrorMessage}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleRetry}
            >
              {t('common.retry')}
            </Button>
          </div>
        )}
        {visible && (
          <Actions
            data={data}
            value={permission}
            onChange={value => {
              setPermission(value);
              return Promise.resolve();
            }}
            className="absolute right-[4px] top-[4px] rounded-sm bg-gray-200 p-1 text-sm dark:bg-gray-900"
          />
        )}
      </div>
      <Button
        loading={loading}
        disabled={!visible || !optionsReady}
        onClick={handleSubmit}
        className="bg-blue-500 px-6 text-white hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-500 dark:active:bg-blue-700 dark:hover:bg-blue-600"
      >
        {t('share.permissions.invite')}
      </Button>
    </div>
  );
}
