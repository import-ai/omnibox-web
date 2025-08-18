import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Vditor from 'vditor';

import { markdownPreviewConfig } from '@/components/markdown';
import { Input } from '@/components/ui/input';
import { VDITOR_CDN } from '@/const';
import useTheme from '@/hooks/use-theme';
import { Resource } from '@/interface';
import { addReferrerPolicyForElement } from '@/lib/add-referrer-policy';
import { http } from '@/lib/request';
import { toolbar } from '@/page/resource/editor/const';

interface IEditorProps {
  namespaceId: string;
  resource: Resource;
  onResource: (resource: Resource) => void;
}

interface UploadedFile {
  name: string;
  link: string;
}

interface UploadResponse {
  namespace_id: string;
  resource_id: string;
  uploaded: UploadedFile[];
  failed: string[];
}

function format(_files: File[], responseText: string): string {
  const response: UploadResponse = JSON.parse(responseText);
  const uploadedMap: Record<string, string> = {};
  response.uploaded.forEach(file => {
    uploadedMap[file.name] = `attachments/${file.link}`;
  });
  const processedResponse = {
    msg: 'success',
    code: 0,
    data: {
      errFiles: response.failed,
      succMap: uploadedMap,
    },
  };
  return JSON.stringify(processedResponse);
}

export default function Editor(props: IEditorProps) {
  const { resource, onResource, namespaceId } = props;
  const { i18n } = useTranslation();
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
        navigate(`/${namespaceId}/${resource.id}`);
        return;
      }
      http
        .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
          name,
          content,
          namespaceId: namespaceId,
        })
        .then((delta: Resource) => {
          app.fire('update_resource', delta);
          onResource(delta);
          navigate(`/${namespaceId}/${resource.id}`);
          onSuccess && onSuccess();
        });
    });
  }, [title, vd]);

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
          .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
            content,
            namespaceId: namespaceId,
          })
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

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    onTitle(resource.name || '');
    if (!resource || !root.current || resource.resource_type === 'folder') {
      return;
    }
    const vditor = new Vditor(root.current, {
      ...(VDITOR_CDN ? { cdn: VDITOR_CDN } : {}),
      tab: '\t',
      cache: { id: `_${resource.id}` },
      preview: markdownPreviewConfig(theme),
      toolbar,
      toolbarConfig: {
        pin: true,
      },
      mode: 'wysiwyg',
      lang: i18n.language == 'en' ? 'en_US' : 'zh_CN',
      upload: {
        url: `/api/v1/namespaces/${namespaceId}/resources/${resource.id}/attachments`,
        accept: 'image/*,.wav',
        max: 1024 * 1024 * 5, // 5MB
        headers: {
          Authorization: `Bearer ${token}`,
        },
        format,
      },
      after: () => {
        vditor.setValue(resource.content || '');
        vditor.setTheme(
          theme.content === 'dark' ? 'dark' : 'classic',
          theme.content,
          theme.code
        );
        if (vditor.vditor.ir && vditor.vditor.ir.element) {
          addReferrerPolicyForElement(vditor.vditor.ir.element);
        }
        if (vditor.vditor.wysiwyg && vditor.vditor.wysiwyg.element) {
          addReferrerPolicyForElement(vditor.vditor.wysiwyg.element);
        }
        setVd(vditor);
      },
    });
    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, [resource]);

  useEffect(() => {
    if (!vd) {
      return;
    }
    vd.setTheme(
      theme.content === 'dark' ? 'dark' : 'classic',
      theme.content,
      theme.code
    );
  }, [vd, theme]);

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
