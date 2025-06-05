import Vditor from 'vditor';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import useTheme from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import React, { useRef, useState, useEffect } from 'react';
import { addReferrerPolicyForElement } from '@/lib/add-referrer-policy';

interface IEditorProps {
  resource: Resource;
}

export default function Editor(props: IEditorProps) {
  const { resource } = props;
  const { app, theme } = useTheme();
  const root = useRef<any>(null);
  const vditor = useRef<any>(null);
  const [title, onTitle] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTitle(e.target.value);
  };

  useEffect(() => {
    return app.on('save', (onSuccess?: () => void) => {
      const name = title.trim();
      const content = vditor.current.getValue();
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
    if (!resource || !root.current) {
      return;
    }
    vditor.current = new Vditor(root.current, {
      cdn: 'https://cdn.jsdelivr.net/npm/vditor@3.10.8',
      cache: { id: `_${resource.id}` },
      preview: {
        hljs: {
          defaultLang: 'plain',
          lineNumber: true,
        },
      },
      after: () => {
        onTitle(resource.name || '');
        vditor.current.setValue(resource.content || '');
        vditor.current.setTheme(
          theme.skin === 'dark' ? 'dark' : 'classic',
          theme.content,
          theme.code,
        );
        if (vditor.current.vditor.ir && vditor.current.vditor.ir.element) {
          addReferrerPolicyForElement(vditor.current.vditor.ir.element);
        }
      },
    });
    return () => {
      if (vditor.current?.vditor) {
        try {
          vditor.current.destroy();
        } catch (e) {
          console.warn('Editor cleanup error:', e);
        }
      }
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
      <div ref={root} className="vditor vditor-reset" />
    </div>
  );
}
