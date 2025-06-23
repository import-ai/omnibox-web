import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import { http } from '@/lib/request';
import { VDITOR_CDN } from '@/const';
import { Resource } from '@/interface';
import useTheme from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import { addReferrerPolicyForElement } from '@/lib/add-referrer-policy';

interface IEditorProps {
  resource: Resource;
  onResource: (resource: Resource) => void;
}

export default function Editor(props: IEditorProps) {
  const { resource, onResource } = props;
  const busy = useRef(false);
  const root = useRef<any>(null);
  const navigate = useNavigate();
  const { app, theme } = useTheme();
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
        navigate(`/${resource.namespace.id}/${resource.id}`);
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
          app.fire('update_resource', delta);
          onResource(delta);
          navigate(`/${resource.namespace.id}/${resource.id}`);
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

  useEffect(() => {
    const keydownFN = (e: KeyboardEvent) => {
      if (!vd) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const content = vd.getValue();
        if (busy.current) {
          return;
        }
        busy.current = true;
        http
          .patch(
            `/namespaces/${resource.namespace.id}/resources/${resource.id}`,
            {
              content,
              namespaceId: resource.namespace.id,
            },
          )
          .then(() => {
            busy.current = false;
          });
      }
    };
    document.addEventListener('keydown', keydownFN);
    return () => {
      document.removeEventListener('keydown', keydownFN);
    };
  }, [vd, resource]);

  return (
    <div>
      <Input
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div ref={root} className="vditor reset-list" />
    </div>
  );
}
