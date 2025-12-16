import { CircleHelp, Copy, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useAPIKeys from '@/hooks/use-api-keys';
import useUser from '@/hooks/use-user';
import {
  type APIKey,
  type APIKeyAttrs,
  APIKeyPermission,
  APIKeyPermissionTarget,
  APIKeyPermissionType,
  type CreateAPIKeyDto,
} from '@/interface';

import ResourceSearch from './components/resource-search';

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
  const [formData, setFormData] = useState({
    root_resource_id: '',
    resourcePermissions: [] as APIKeyPermissionType[],
    chatPermissions: [] as APIKeyPermissionType[],
  });

  const handleCreateAPIKey = async () => {
    if (!uid || !namespaceId || !formData.root_resource_id) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    if (
      formData.resourcePermissions.length === 0 &&
      formData.chatPermissions.length === 0
    ) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    setCreating(true);
    try {
      const permissions: APIKeyPermission[] = [];
      if (formData.resourcePermissions.length > 0) {
        permissions.push({
          target: APIKeyPermissionTarget.RESOURCES,
          permissions: formData.resourcePermissions,
        });
      }
      if (formData.chatPermissions.length > 0) {
        permissions.push({
          target: APIKeyPermissionTarget.CHAT,
          permissions: formData.chatPermissions,
        });
      }

      const attrs: APIKeyAttrs = {
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
      setFormData({
        root_resource_id: '',
        resourcePermissions: [],
        chatPermissions: [],
      });
    } catch {
      toast.error(t('api_key.create.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateAPIKey = async () => {
    if (!editingKey || !formData.root_resource_id) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    if (
      formData.resourcePermissions.length === 0 &&
      formData.chatPermissions.length === 0
    ) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    setUpdating(true);
    try {
      const permissions: APIKeyPermission[] = [];
      if (formData.resourcePermissions.length > 0) {
        permissions.push({
          target: APIKeyPermissionTarget.RESOURCES,
          permissions: formData.resourcePermissions,
        });
      }
      if (formData.chatPermissions.length > 0) {
        permissions.push({
          target: APIKeyPermissionTarget.CHAT,
          permissions: formData.chatPermissions,
        });
      }

      const attrs: APIKeyAttrs = {
        root_resource_id: formData.root_resource_id,
        permissions,
      };

      await patchAPIKey(editingKey.id, attrs);
      toast.success(t('api_key.update.success'));
      setUpdateDialogOpen(false);
      setEditingKey(null);
      setFormData({
        root_resource_id: '',
        resourcePermissions: [],
        chatPermissions: [],
      });
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
    const resourcePerms =
      key.attrs.permissions.find(
        p => p.target === APIKeyPermissionTarget.RESOURCES
      )?.permissions || [];
    const chatPerms =
      key.attrs.permissions.find(p => p.target === APIKeyPermissionTarget.CHAT)
        ?.permissions || [];
    setFormData({
      root_resource_id: key.attrs.root_resource_id,
      resourcePermissions: resourcePerms,
      chatPermissions: chatPerms,
    });
    setUpdateDialogOpen(true);
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
    target: APIKeyPermissionTarget,
    permission: APIKeyPermissionType,
    checked: boolean
  ) => {
    const field =
      target === APIKeyPermissionTarget.RESOURCES
        ? 'resourcePermissions'
        : 'chatPermissions';
    if (checked) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], permission],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter(p => p !== permission),
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
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

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-sm font-semibold">
              {t('create')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('api_key.create.title')}</DialogTitle>
              <DialogDescription>
                {t('api_key.create.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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
                        className="h-5 w-5 p-0 hover:bg-transparent"
                        type="button"
                      >
                        <CircleHelp className="h-4 w-4 text-muted-foreground" />
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('api_key.permissions_resources')}</Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(APIKeyPermissionType).map(permission => (
                      <div
                        key={permission}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`resources-${permission}`}
                          checked={formData.resourcePermissions.includes(
                            permission
                          )}
                          onCheckedChange={checked =>
                            handlePermissionChange(
                              APIKeyPermissionTarget.RESOURCES,
                              permission,
                              !!checked
                            )
                          }
                        />
                        <Label htmlFor={`resources-${permission}`}>
                          {t(`api_key.permission_types.${permission}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('api_key.permissions_chat')}</Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(APIKeyPermissionType).map(permission => (
                      <div
                        key={permission}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`chat-${permission}`}
                          checked={formData.chatPermissions.includes(
                            permission
                          )}
                          onCheckedChange={checked =>
                            handlePermissionChange(
                              APIKeyPermissionTarget.CHAT,
                              permission,
                              !!checked
                            )
                          }
                        />
                        <Label htmlFor={`chat-${permission}`}>
                          {t(`api_key.permission_types.${permission}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button onClick={handleCreateAPIKey} disabled={creating}>
                {creating ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('api_key.update.title')}</DialogTitle>
              <DialogDescription>
                {t('api_key.update.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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
                        className="h-5 w-5 p-0 hover:bg-transparent"
                        type="button"
                      >
                        <CircleHelp className="h-4 w-4 text-muted-foreground" />
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('api_key.permissions_resources')}</Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(APIKeyPermissionType).map(permission => (
                      <div
                        key={permission}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`update-resources-${permission}`}
                          checked={formData.resourcePermissions.includes(
                            permission
                          )}
                          onCheckedChange={checked =>
                            handlePermissionChange(
                              APIKeyPermissionTarget.RESOURCES,
                              permission,
                              !!checked
                            )
                          }
                        />
                        <Label htmlFor={`update-resources-${permission}`}>
                          {t(`api_key.permission_types.${permission}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('api_key.permissions_chat')}</Label>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(APIKeyPermissionType).map(permission => (
                      <div
                        key={permission}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`update-chat-${permission}`}
                          checked={formData.chatPermissions.includes(
                            permission
                          )}
                          onCheckedChange={checked =>
                            handlePermissionChange(
                              APIKeyPermissionTarget.CHAT,
                              permission,
                              !!checked
                            )
                          }
                        />
                        <Label htmlFor={`update-chat-${permission}`}>
                          {t(`api_key.permission_types.${permission}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUpdateDialogOpen(false)}
              >
                {t('cancel')}
              </Button>
              <Button onClick={handleUpdateAPIKey} disabled={updating}>
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
                        className="flex items-center justify-center w-10 h-10 lg:w-auto lg:h-auto lg:p-1 transition-opacity hover:opacity-70"
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
                        className="flex items-center justify-center w-10 h-10 lg:w-auto lg:h-auto lg:p-1 transition-opacity hover:opacity-70"
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
                        className="flex items-center justify-center w-10 h-10 lg:w-auto lg:h-auto lg:p-1 transition-opacity hover:opacity-70"
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
                          <button className="flex items-center justify-center w-10 h-10 lg:w-auto lg:h-auto lg:p-1 transition-opacity hover:opacity-70">
                            <Trash2 className="size-4 text-muted-foreground" />
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
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
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

              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {t('api_key.permission_scope')}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {key.attrs.root_resource_id}
                </span>
              </div>

              {key.attrs.related_app_id && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">
                    {t('api_key.related_application')}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t(`applications.app_names.${key.attrs.related_app_id}`, {
                      defaultValue: key.attrs.related_app_id,
                    })}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {t('api_key.permissions')}
                </span>
                {key.attrs.permissions.map(perm => (
                  <div key={perm.target} className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      {perm.target === 'resources'
                        ? 'Resources'
                        : perm.target === 'chat'
                          ? 'Chat'
                          : perm.target}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {perm.permissions.map(permission => (
                        <div
                          key={permission}
                          className="inline-flex h-6 items-center justify-center rounded-lg border border-border px-2 py-0.5"
                        >
                          <span className="text-xs font-medium text-muted-foreground">
                            {permission.charAt(0).toUpperCase() +
                              permission.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
