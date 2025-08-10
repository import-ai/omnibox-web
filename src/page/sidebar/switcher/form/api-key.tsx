import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import useAPIKeys from '@/hooks/use-api-keys';
import useUser from '@/hooks/use-user';
import ResourceSearch from './components/resource-search';
import {
  type APIKey,
  type APIKeyAttrs,
  APIKeyPermissionTarget,
  APIKeyPermissionType,
  type CreateAPIKeyDto,
} from '@/interface';

export function APIKeyForm() {
  const { t } = useTranslation();
  const params = useParams();
  const { uid } = useUser();
  const namespaceId = params.namespace_id || '';

  const { apiKeys, loading, createAPIKey, deleteAPIKey } = useAPIKeys(
    uid!,
    namespaceId
  );

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    root_resource_id: '',
    permissions: [APIKeyPermissionType.READ],
  });

  const handleCreateAPIKey = async () => {
    if (!uid || !namespaceId || !formData.root_resource_id) {
      toast.error(t('api_key.create.validation_error'));
      return;
    }

    setCreating(true);
    try {
      const attrs: APIKeyAttrs = {
        root_resource_id: formData.root_resource_id,
        permissions: [
          {
            target: APIKeyPermissionTarget.RESOURCES,
            permissions: formData.permissions,
          },
        ],
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
        permissions: [APIKeyPermissionType.READ],
      });
    } catch {
      toast.error(t('api_key.create.error'));
    } finally {
      setCreating(false);
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
    permission: APIKeyPermissionType,
    checked: boolean
  ) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission),
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
                <Label htmlFor="root_resource_id">
                  {t('api_key.root_resource_id')}
                </Label>
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

              <div className="space-y-2">
                <Label>{t('api_key.permissions')}</Label>
                <div className="space-y-2">
                  {Object.values(APIKeyPermissionType).map(permission => (
                    <div
                      key={permission}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={permission}
                        checked={formData.permissions.includes(permission)}
                        onCheckedChange={checked =>
                          handlePermissionChange(permission, !!checked)
                        }
                      />
                      <Label htmlFor={permission} className="capitalize">
                        {permission}
                      </Label>
                    </div>
                  ))}
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
                      {t('api_key.root_resource_id')}
                    </Label>
                    <p className="text-sm font-mono">
                      {key.attrs.root_resource_id}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('api_key.permissions')}
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {key.attrs.permissions[0]?.permissions.map(permission => (
                        <span
                          key={permission}
                          className="px-2 py-1 text-xs bg-secondary rounded-md capitalize"
                        >
                          {permission}
                        </span>
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
