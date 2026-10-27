import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/Button';
import {
  type ResourcePickerResource,
  WorkspaceResourcePicker,
} from '@/components/resourcePicker';
import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import { searchFieldClearButtonClassName } from '@/components/search/SearchField';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import type { Resource, ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';
import { fetchRootResources } from '@/service/resource';

import { prepareCollectUrl } from './addLink';

interface AddLinkPanelProps {
  namespaceId: string;
  onCancel: () => void;
  onSaved: (resourceId: string) => void;
}

export function AddLinkPanel({
  namespaceId,
  onCancel,
  onSaved,
}: AddLinkPanelProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [destination, setDestination] = useState<ResourceMeta | null>(null);
  const [focused, setFocused] = useState(true);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelActiveRef = useRef(true);
  const showEllipsis = url.length > 0 && !focused && !hovered;

  useEffect(() => {
    panelActiveRef.current = true;
    return () => {
      panelActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (showEllipsis) {
      inputRef.current && (inputRef.current.scrollLeft = 0);
    }
  }, [showEllipsis]);

  useEffect(() => {
    let active = true;
    fetchRootResources(namespaceId)
      .then(roots => {
        const root = roots.private;
        if (!active || !root?.id) {
          return;
        }
        setDestination({
          id: root.id,
          name: t('private'),
          parent_id: root.parent_id,
          resource_type: root.resource_type,
          attrs: root.attrs,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [namespaceId, t]);

  const handleSave = async () => {
    const prepared = prepareCollectUrl(url);
    if (!('url' in prepared) || !destination || saving) {
      if (!('url' in prepared)) {
        setInvalid(true);
        toast.error(
          t(
            prepared.error === 'self'
              ? 'chat.home.upload.self_link'
              : 'chat.home.upload.invalid_link'
          ),
          { position: 'bottom-right' }
        );
      }
      return;
    }
    setSaving(true);
    try {
      const response = await http.post<{
        resource_id?: string;
        resourceId?: string;
      }>(`/namespaces/${namespaceId}/wizard/collect/url`, {
        url: prepared.url,
        parentId: destination.id,
      });
      if (!panelActiveRef.current) return;
      const resourceId = response.resource_id || response.resourceId;
      if (!resourceId) {
        setSaving(false);
        return;
      }
      onSaved(resourceId);
    } catch {
      if (!panelActiveRef.current) return;
      setSaving(false);
    }
  };

  const selectDestination = (resource: ResourcePickerResource) => {
    setDestination(resource);
    setPickerOpen(false);
  };

  return (
    <>
      <div
        className="flex flex-1 flex-col gap-4"
        onKeyDown={event => {
          if (event.key === 'Escape' && !pickerOpen && !saving) {
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <div
          className="relative"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Input
            ref={inputRef}
            autoFocus
            name="omnibox-add-link"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            disabled={saving}
            aria-invalid={invalid || undefined}
            placeholder={t('chat.home.upload.link_placeholder')}
            className={cn(
              'border-line h-9 whitespace-nowrap shadow-none focus-visible:border-line focus-visible:ring-0 autofill:shadow-[inset_0_0_0_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]',
              url.length > 0 && 'pr-16'
            )}
            style={{
              overflow: 'hidden',
              textOverflow: showEllipsis ? 'ellipsis' : 'clip',
            }}
            onChange={event => {
              setUrl(event.target.value);
              setInvalid(false);
            }}
            onFocus={() => setFocused(true)}
            onBlur={event => {
              setFocused(false);
              event.currentTarget.scrollLeft = 0;
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
          {url.length > 0 && (
            <span className="absolute inset-y-0 right-2 flex items-center">
              <Button
                type="button"
                variant="ghost"
                aria-label={t('search.clear')}
                className={searchFieldClearButtonClassName}
                disabled={saving}
                onClick={() => {
                  setUrl('');
                  setInvalid(false);
                  inputRef.current?.focus();
                }}
              >
                {t('search.clear')}
              </Button>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-normal text-muted-foreground">
            {t('chat.home.upload.save_to')}
          </Label>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-start gap-2 pr-2 pl-3 font-normal"
            disabled={saving}
            onClick={() => setPickerOpen(true)}
          >
            {destination && (
              <span className="size-4 shrink-0 [&>svg]:size-4">
                <ResourceTypeIcon
                  expand={false}
                  resource={destination as Resource}
                />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-left">
              {destination?.name || t('private')}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex gap-5">
          <span className={cn('flex flex-1', saving && 'cursor-not-allowed')}>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full"
              disabled={saving}
              onClick={onCancel}
            >
              {t('cancel')}
            </Button>
          </span>
          <span
            className={cn(
              'flex flex-1',
              (!url.trim() || saving || !destination) && 'cursor-not-allowed'
            )}
          >
            <Button
              type="button"
              className="h-8 w-full"
              disabled={!url.trim() || saving || !destination}
              loading={saving}
              onClick={() => void handleSave()}
            >
              {t('chat.home.upload.save')}
            </Button>
          </span>
        </div>
      </div>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="w-[480px] max-w-[90%] gap-2 overflow-hidden bg-popover px-4 pt-8 pb-5 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('chat.tools.select_resource')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('chat.tools.select_resource')}
            </DialogDescription>
          </DialogHeader>
          <WorkspaceResourcePicker
            namespaceId={namespaceId}
            linkDestination
            onSelect={selectDestination}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
