import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import Vditor from 'vditor';

import { Input } from '@/components/input';
import { markdownPreviewConfig } from '@/components/markdown';
import { EDITOR, VDITOR_CDN } from '@/const';
import useTheme from '@/hooks/useTheme';
import { Resource } from '@/interface';
import { addReferrerPolicyForElement } from '@/lib/addReferrerPolicy';
import { getLangOnly } from '@/lib/lang';
import { http } from '@/lib/request';
import {
  clearCache,
  getCache,
  updateCacheContent,
  updateCacheTitle,
} from '@/page/resource/editor/cache';
import { toolbar } from '@/page/resource/editor/const';

import Tiptap from '../newEditor';

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
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [vd, setVd] = useState<Vditor>();
  const [title, onTitle] = useState('');
  const [tiptapContent, setTiptapContent] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  const handleTiptapChange = (content: string) => {
    setTiptapContent(content);
    updateCacheContent(resource.id, content);
  };

  useEffect(() => {
    return app.on('save', (onSuccess?: () => void) => {
      const name = title.trim();
      const content: string | undefined = EDITOR
        ? tiptapContent
        : vd?.getValue();
      if (!content && !name) {
        navigate(`/${namespaceId}/${resource.id}`, {
          state: loc.state,
        });
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
          clearCache(resource.id);
          navigate(`/${namespaceId}/${resource.id}`, {
            state: loc.state,
          });
          onSuccess && onSuccess();
        });
    });
  }, [title, tiptapContent, vd, loc.state]);

  useEffect(() => {
    const keydownFN = (e: KeyboardEvent) => {
      if (!EDITOR && !vd) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const content = EDITOR ? tiptapContent : vd?.getValue();
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
  }, [tiptapContent, vd, resource]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const cache = getCache(resource.id);
    const cachedTitle = cache?.title || resource.name || '';
    const cachedContent = cache?.content || resource.content || '';

    onTitle(cachedTitle);
    setTiptapContent(cachedContent);

    if (!resource || !root.current || resource.resource_type === 'folder') {
      return;
    }

    const vditor = new Vditor(root.current, {
      ...(VDITOR_CDN ? { cdn: VDITOR_CDN } : {}),
      tab: '\t',
      preview: markdownPreviewConfig(theme),
      toolbar,
      toolbarConfig: {
        pin: true,
      },
      cache: {
        enable: false,
      },
      mode: 'wysiwyg',
      lang: getLangOnly(i18n) === 'zh' ? 'zh_CN' : 'en_US',
      upload: {
        url: `/api/v1/namespaces/${namespaceId}/resources/${resource.id}/attachments`,
        accept: 'image/*,.wav',
        max: 1024 * 1024 * 5, // 5MB
        headers: {
          Authorization: `Bearer ${token}`,
        },
        format,
      },
      input: (value: string) => {
        updateCacheContent(resource.id, value);
      },
      after: () => {
        vditor.setValue(cachedContent);
        vditor.setTheme(
          theme.content === 'dark' ? 'dark' : 'classic',
          theme.content,
          theme.code
        );
        if (resource.content) {
          if (vditor.vditor.ir && vditor.vditor.ir.element) {
            addReferrerPolicyForElement(vditor.vditor.ir.element);
          }
          if (vditor.vditor.wysiwyg && vditor.vditor.wysiwyg.element) {
            addReferrerPolicyForElement(vditor.vditor.wysiwyg.element);
          }
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
    <div className="min-w-0 bg-white dark:bg-background">
      <Input
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter title"
        className="h-auto w-full rounded-none border-0 bg-transparent px-0 py-4 text-4xl font-bold shadow-none outline-none ring-0 placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 dark:placeholder:text-neutral-700"
      />

      {EDITOR ? (
        <Tiptap
          content={tiptapContent}
          namespaceId={namespaceId}
          onChange={handleTiptapChange}
          resourceId={resource.id}
        />
      ) : (
        <div ref={root} className="vditor reset-list" />
      )}
    </div>
  );
}
