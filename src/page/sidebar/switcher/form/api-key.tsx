import {
  Copy,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  const { t } = useTranslation();
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
    return <div className="flex justify-center p-4">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{t('setting.api_key')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('api_key.description')}
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4" />
              {t('api_key.create.title')}
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
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
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
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
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

      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">{t('api_key.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map(key => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-mono">
                      {visibleKeys.has(key.id) ? key.value : maskKey(key.value)}
                    </CardTitle>
                    <CardDescription>
                      {t('created')}:{' '}
                      {new Date(key.created_at!).toLocaleDateString()}
                    </CardDescription>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key.value)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(key)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
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
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('api_key.permission_scope')}
                    </Label>
                    <p className="text-sm font-mono">
                      {key.attrs.root_resource_id}
                    </p>
                  </div>

                  {key.attrs.related_app_id && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('api_key.related_application')}
                      </Label>
                      <p className="text-sm">
                        {t(
                          `applications.app_names.${key.attrs.related_app_id}`,
                          {
                            defaultValue: key.attrs.related_app_id,
                          }
                        )}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('api_key.permissions')}
                    </Label>
                    <div className="space-y-2 mt-1">
                      {key.attrs.permissions.map(perm => (
                        <div key={perm.target}>
                          <div className="text-xs font-medium text-muted-foreground capitalize mb-1">
                            {perm.target}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {perm.permissions.map(permission => (
                              <span
                                key={permission}
                                className="px-2 py-1 text-xs bg-secondary rounded-md capitalize"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
