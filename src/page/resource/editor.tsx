import Vditor from 'vditor';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import useTheme from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { IUseResource } from '@/hooks/user-resource';
import React, { useRef, useState, useEffect } from 'react';

interface IProps extends Omit<IUseResource, 'resource'> {
  resource: Resource;
}

export default function Editor(props: IProps) {
  const { resource } = props;
  const { app, theme } = useTheme();
  const root = useRef<any>(null);
  const vditor = useRef<any>(null);
  const [title, onTitle] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTitle(e.target.value);
  };

  useEffect(() => {
    return app.on('save', () => {
      const name = title.trim();
      const content = vditor.current.getValue();
      if (!content || !name) {
        app.fire('resource_children', true);
        return;
      }
      http
        .patch(`/resources/${resource.id}`, {
          name,
          content,
          namespace: resource.namespace.id,
        })
        .then((delta: Resource) => {
          app.fire('resource_update', delta);
          app.fire('resource_children', true);
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
      },
    });
    return () => {
      if (vditor.current?.vditor) {
        // 检查核心对象是否存在
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
