import { CircleHelp, Copy, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import useAPIKeys from '@/hooks/useApiKeys';
import useUser from '@/hooks/useUser';
import {
  type APIKey,
  type APIKeyAttrs,
  type APIKeyPermission,
  APIKeyPermissionTarget,
  APIKeyPermissionType,
  type CreateAPIKeyDto,
} from '@/interface';
import { cn } from '@/lib/utils';

import ResourceSearch from '../../components/ResourceSearch';

function APIKeyInfoRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const API_KEY_PERMISSION_MATRIX = [
  {
    target: APIKeyPermissionTarget.RESOURCES,
    actions: [
      APIKeyPermissionType.CREATE,
      APIKeyPermissionType.READ,
      APIKeyPermissionType.UPDATE,
      APIKeyPermissionType.DELETE,
    ],
  },
  {
    target: APIKeyPermissionTarget.CHAT,
    actions: [APIKeyPermissionType.CREATE],
  },
  {
    target: APIKeyPermissionTarget.TAGS,
    actions: [APIKeyPermissionType.CREATE, APIKeyPermissionType.READ],
  },
  {
    target: APIKeyPermissionTarget.SEARCH,
    actions: [APIKeyPermissionType.READ],
  },
] as const satisfies readonly {
  target: APIKeyPermissionTarget;
  actions: readonly APIKeyPermissionType[];
}[];

type ConfiguredAPIKeyPermissionTarget =
  (typeof API_KEY_PERMISSION_MATRIX)[number]['target'];

type APIKeyPermissionState = Record<
  ConfiguredAPIKeyPermissionTarget,
  APIKeyPermissionType[]
>;

interface APIKeyFormData {
  note: string;
  root_resource_id: string;
  permissions: APIKeyPermissionState;
}

const API_KEY_NOTE_MAX_LENGTH = 128;

const configuredPermissionTargets = new Set<string>(
  API_KEY_PERMISSION_MATRIX.map(({ target }) => target)
);

const isConfiguredPermissionTarget = (
  target: APIKeyPermission['target']
): target is ConfiguredAPIKeyPermissionTarget =>
  configuredPermissionTargets.has(target);

const getRootResourceLabel = (
  rootType: APIKey['root_resource'] extends infer RootResource
    ? RootResource extends null | undefined
      ? never
      : RootResource['root_type']
    : never,
  fallbackName: string,
  t: (key: string) => string
) => {
  if (rootType === 'private' || rootType === 'teamspace') {
    return t(rootType);
  }
  return fallbackName;
};

const getRootResourcePathLabel = (
  apiKey: APIKey,
  t: (key: string) => string
) => {
  const rootResource = apiKey.root_resource;
  if (!rootResource || rootResource.path.length === 0) {
    return t('api_key.resource_not_found');
  }

  return rootResource.path
    .map((resource, index) =>
      index === 0
        ? getRootResourceLabel(rootResource.root_type, resource.name, t)
        : resource.name
    )
    .join(' / ');
};

const createPermissionState = (
  permissions: APIKeyPermission[] = []
): APIKeyPermissionState => {
  const permissionMap = new Map(
    permissions.map(permission => [permission.target, permission.permissions])
  );

  return API_KEY_PERMISSION_MATRIX.reduce((state, { target, actions }) => {
    const selectedPermissions = permissionMap.get(target) ?? [];
    state[target] = actions.filter(action =>
      selectedPermissions.includes(action)
    );
    return state;
  }, {} as APIKeyPermissionState);
};

const createEmptyFormData = (): APIKeyFormData => ({
  note: '',
  root_resource_id: '',
  permissions: createPermissionState(),
});

const buildPermissionPayload = (
  permissions: APIKeyPermissionState,
  existingPermissions: APIKeyPermission[] = []
): APIKeyPermission[] => {
  const existingPermissionMap = new Map(
    existingPermissions.map(permission => [
      permission.target,
      permission.permissions,
    ])
  );
  const selectedPermissions = API_KEY_PERMISSION_MATRIX.reduce<
    APIKeyPermission[]
  >((payload, { target, actions }) => {
    const configuredPermissions = actions.filter(action =>
      permissions[target].includes(action)
    );
    const unknownExistingPermissions = (
      existingPermissionMap.get(target) ?? []
    ).filter(existingPermission => !actions.includes(existingPermission));
    const targetPermissions = [
      ...configuredPermissions,
      ...unknownExistingPermissions,
    ];

    if (targetPermissions.length > 0) {
      payload.push({
        target,
        permissions: targetPermissions,
      });
    }

    return payload;
  }, []);
  const unconfiguredPermissions = existingPermissions.filter(
    permission =>
      !isConfiguredPermissionTarget(permission.target) &&
      permission.permissions.length > 0
  );

  return [...selectedPermissions, ...unconfiguredPermissions];
};

const formatPermissionLabel = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function APIKeyForm() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const { uid } = useUser();
  const namespaceId = params.namespace_id || '';

  const { apiKeys, loading, createAPIKey, patchAPIKey, deleteAPIKey } =
    useAPIKeys(uid!, namespaceId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [formData, setFormData] = useState<APIKeyFormData>(() =>
    createEmptyFormData()
  );

  const handleCreateAPIKey = async () => {
    if (formData.note.length > API_KEY_NOTE_MAX_LENGTH) {
      toast.error(
        t('api_key.note_length_error', { max: API_KEY_NOTE_MAX_LENGTH })
      );
      return;
    }

    if (!uid || !namespaceId || !formData.root_resource_id) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    const permissions = buildPermissionPayload(formData.permissions);
    if (permissions.length === 0) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    setCreating(true);
    try {
      const attrs: APIKeyAttrs = {
        note: formData.note.trim(),
        root_resource_id: formData.root_resource_id,
        permissions,
      };

      const createData: CreateAPIKeyDto = {
        user_id: uid,
        namespace_id: namespaceId,
        attrs,
      };

      await createAPIKey(createData);
      toast.success(t('api_key.create.success'));
      setCreateDialogOpen(false);
      setFormData(createEmptyFormData());
    } catch {
      toast.error(t('api_key.create.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateAPIKey = async () => {
    if (formData.note.length > API_KEY_NOTE_MAX_LENGTH) {
      toast.error(
        t('api_key.note_length_error', { max: API_KEY_NOTE_MAX_LENGTH })
      );
      return;
    }

    if (!editingKey || !formData.root_resource_id) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    const permissions = buildPermissionPayload(
      formData.permissions,
      editingKey.attrs.permissions
    );
    if (permissions.length === 0) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    setUpdating(true);
    try {
      const attrs: APIKeyAttrs = {
        note: formData.note.trim(),
        root_resource_id: formData.root_resource_id,
        permissions,
      };

      await patchAPIKey(editingKey.id, attrs);
      toast.success(t('api_key.update.success'));
      setUpdateDialogOpen(false);
      setEditingKey(null);
      setFormData(createEmptyFormData());
    } catch {
      toast.error(t('api_key.update.error'));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAPIKey = async (key: APIKey) => {
    try {
      await deleteAPIKey(key.id);
      toast.success(t('api_key.delete.success'));
    } catch {
      toast.error(t('api_key.delete.error'));
    }
  };

  const handleEditClick = (key: APIKey) => {
    setEditingKey(key);
    setFormData({
      note: key.attrs.note ?? '',
      root_resource_id: key.attrs.root_resource_id,
      permissions: createPermissionState(key.attrs.permissions),
    });
    setUpdateDialogOpen(true);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    setFormData(createEmptyFormData());
  };

  const handleUpdateDialogOpenChange = (open: boolean) => {
    setUpdateDialogOpen(open);

    if (!open) {
      setEditingKey(null);
      setFormData(createEmptyFormData());
    }
  };

  const copyToClipboard = (value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(t('api_key.copy.success')));
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const maskKey = (key: string) => {
    return key.substring(0, 7) + '********' + key.substring(key.length - 4);
  };

  const handlePermissionChange = (
    target: ConfiguredAPIKeyPermissionTarget,
    permission: APIKeyPermissionType,
    checked: boolean
  ) => {
    setFormData(prev => {
      const targetPermissions = prev.permissions[target];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [target]: checked
            ? Array.from(new Set([...targetPermissions, permission]))
            : targetPermissions.filter(p => p !== permission),
        },
      };
    });
  };

  const getPermissionTargetLabel = (target: string) =>
    t(`api_key.permission_targets.${target}`, {
      defaultValue: formatPermissionLabel(target),
    });

  const getPermissionSectionLabel = (
    target: ConfiguredAPIKeyPermissionTarget
  ) =>
    t(`api_key.permission_sections.${target}`, {
      defaultValue: getPermissionTargetLabel(target),
    });

  const getPermissionTypeLabel = (permission: string) =>
    t(`api_key.permission_types.${permission}`, {
      defaultValue: formatPermissionLabel(permission),
    });

  const renderPermissionControls = (idPrefix: string) => (
    <div className="space-y-4">
      {API_KEY_PERMISSION_MATRIX.map(({ target, actions }) => (
        <div key={target} className="space-y-2">
          <Label>{getPermissionSectionLabel(target)}</Label>
          <div className="flex flex-wrap gap-3">
            {actions.map(permission => {
              const checkboxId = `${idPrefix}-${target}-${permission}`;

              return (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={checkboxId}
                    checked={formData.permissions[target].includes(permission)}
                    onCheckedChange={checked =>
                      handlePermissionChange(target, permission, !!checked)
                    }
                  />
                  <Label htmlFor={checkboxId}>
                    {getPermissionTypeLabel(permission)}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderNoteField = (id: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{t('api_key.note')}</Label>
        <span className="text-xs text-muted-foreground">
          {formData.note.length}/{API_KEY_NOTE_MAX_LENGTH}
        </span>
      </div>
      <Input
        id={id}
        value={formData.note}
        maxLength={API_KEY_NOTE_MAX_LENGTH}
        placeholder={t('api_key.note_placeholder')}
        onChange={event =>
          setFormData(prev => ({
            ...prev,
            note: event.target.value,
          }))
        }
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-2.5">
          <h3 className="text-base font-semibold text-foreground">
            {t('setting.api_key')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('api_key.description')}
          </p>
        </div>

        <Dialog
          open={createDialogOpen}
          onOpenChange={handleCreateDialogOpenChange}
        >
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
            >
              {t('create')}
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-hidden">
            <DialogHeader>
              <DialogTitle>{t('api_key.create.title')}</DialogTitle>
              <DialogDescription>
                {t('api_key.create.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {renderNoteField('api_key_note')}

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="root_resource_id">
                    {t('api_key.permission_scope')}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-5 p-0 hover:bg-transparent"
                        type="button"
                      >
                        <CircleHelp className="size-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('api_key.permission_scope_tooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ResourceSearch
                  namespaceId={namespaceId}
                  value={formData.root_resource_id}
                  onValueChange={resourceId =>
                    setFormData(prev => ({
                      ...prev,
                      root_resource_id: resourceId,
                    }))
                  }
                  placeholder={t('api_key.root_resource_id_placeholder')}
                />
              </div>

              {renderPermissionControls('create')}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleCreateAPIKey}
                disabled={creating}
                variant="default"
              >
                {creating ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={updateDialogOpen}
          onOpenChange={handleUpdateDialogOpenChange}
        >
          <DialogContent className="overflow-hidden">
            <DialogHeader>
              <DialogTitle>{t('api_key.update.title')}</DialogTitle>
              <DialogDescription>
                {t('api_key.update.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {renderNoteField('update_api_key_note')}

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="update_root_resource_id">
                    {t('api_key.permission_scope')}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-5 p-0 hover:bg-transparent"
                        type="button"
                      >
                        <CircleHelp className="size-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('api_key.permission_scope_tooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ResourceSearch
                  namespaceId={namespaceId}
                  value={formData.root_resource_id}
                  onValueChange={resourceId =>
                    setFormData(prev => ({
                      ...prev,
                      root_resource_id: resourceId,
                    }))
                  }
                  placeholder={t('api_key.root_resource_id_placeholder')}
                />
              </div>

              {renderPermissionControls('update')}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUpdateDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleUpdateAPIKey}
                disabled={updating}
                variant="default"
              >
                {updating ? t('updating') : t('update')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {apiKeys.length === 0 ? (
        <div className="rounded-md border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('api_key.empty')}</p>
        </div>
      ) : (
        apiKeys.map(key => (
          <div key={key.id} className="rounded-md border border-border p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {visibleKeys.has(key.id) ? key.value : maskKey(key.value)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t('created')}
                    {i18n.language.startsWith('zh') ? '：' : ': '}
                    {new Date(key.created_at!).toLocaleDateString(
                      i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US',
                      {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1 lg:gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:size-auto lg:p-1"
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="size-4 text-muted-foreground" />
                        ) : (
                          <Eye className="size-4 text-muted-foreground" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {visibleKeys.has(key.id)
                        ? t('api_key.hide')
                        : t('api_key.show')}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => copyToClipboard(key.value)}
                        className="flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:size-auto lg:p-1"
                      >
                        <Copy className="size-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {t('copy.title')}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleEditClick(key)}
                        className="flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:size-auto lg:p-1"
                      >
                        <Pencil className="size-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{t('edit')}</TooltipContent>
                  </Tooltip>

                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <button className="group flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:size-auto lg:p-1">
                            <Trash2 className="size-4 text-muted-foreground group-hover:text-destructive" />
                          </button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">{t('delete')}</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('api_key.delete.confirm.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('api_key.delete.confirm.description')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">{t('cancel')}</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAPIKey(key)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <APIKeyInfoRow label={t('api_key.permission_scope')}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="break-words text-sm font-semibold text-foreground">
                      {getRootResourcePathLabel(key, t)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-80 break-words">
                    {getRootResourcePathLabel(key, t)}
                  </TooltipContent>
                </Tooltip>
              </APIKeyInfoRow>

              {key.attrs.note && (
                <APIKeyInfoRow label={t('api_key.note')}>
                  <span className="whitespace-pre-wrap break-words text-sm font-semibold text-foreground">
                    {key.attrs.note}
                  </span>
                </APIKeyInfoRow>
              )}

              {key.attrs.related_app_id && (
                <APIKeyInfoRow label={t('api_key.related_application')}>
                  <span className="text-sm font-semibold text-foreground">
                    {t(`applications.app_names.${key.attrs.related_app_id}`, {
                      defaultValue: key.attrs.related_app_id,
                    })}
                  </span>
                </APIKeyInfoRow>
              )}

              <APIKeyInfoRow label={t('api_key.permissions')}>
                <div className="flex flex-col gap-3">
                  {key.attrs.permissions.map(perm => (
                    <div key={perm.target} className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {getPermissionTargetLabel(perm.target)}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {perm.permissions.map(permission => (
                          <div
                            key={permission}
                            className="inline-flex h-6 items-center justify-center rounded-lg border border-border px-2 py-0.5"
                          >
                            <span className="text-xs font-medium text-muted-foreground">
                              {getPermissionTypeLabel(permission)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </APIKeyInfoRow>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
