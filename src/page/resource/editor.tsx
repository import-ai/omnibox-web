import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import { http } from '@/lib/request';
import { VDITOR_CDN } from '@/const';
import { Resource } from '@/interface';
import useTheme from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import React, { useEffect, useRef, useState } from 'react';
import { addReferrerPolicyForElement } from '@/lib/add-referrer-policy';

interface IEditorProps {
  resource: Resource;
}

export default function Editor(props: IEditorProps) {
  const { resource } = props;
  const { app, theme } = useTheme();
  const root = useRef<any>(null);
  const [vd, setVd] = useState<Vditor>();
  const [title, onTitle] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTitle(e.target.value);
  };

  useEffect(() => {
    return app.on('save', (onSuccess?: () => void) => {
      const name = title.trim();
      const content: string | undefined = vd?.getValue();
      if (!content && !name) {
        app.fire('resource_children', true);
        return;
      }
      http
        .patch(
          `/namespaces/${resource.namespace.id}/resources/${resource.id}`,
          {
            name,
            content,
            namespaceId: resource.namespace.id,
          },
        )
        .then((delta: Resource) => {
          app.fire('resource_update', delta);
          app.fire('resource_children', true);
          onSuccess && onSuccess();
        });
    });
  }, [title]);

  useEffect(() => {
    if (!resource || !root.current || resource.resource_type === 'folder') {
      return;
    }
    const vditor = new Vditor(root.current, {
      ...(VDITOR_CDN ? { cdn: VDITOR_CDN } : {}),
      tab: '\t',
      cache: { id: `_${resource.id}` },
      preview: {
        hljs: {
          defaultLang: 'plain',
          lineNumber: true,
        },
      },
      after: () => {
        onTitle(resource.name || '');
        vditor.setValue(resource.content || '');
        vditor.setTheme(
          theme.skin === 'dark' ? 'dark' : 'classic',
          theme.content,
          theme.code,
        );
        if (vditor.vditor.ir && vditor.vditor.ir.element) {
          addReferrerPolicyForElement(vditor.vditor.ir.element);
        }
        setVd(vditor);
      },
    });
    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, [resource, theme]);

  return (
    <div>
      <Input
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div ref={root} className="vditor" />
    </div>
  );
}
