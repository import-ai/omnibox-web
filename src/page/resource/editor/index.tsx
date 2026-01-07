import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/input';
import useTheme from '@/hooks/use-theme';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import {
  clearCache,
  getCache,
  updateCacheContent,
  updateCacheTitle,
} from '@/page/resource/editor/cache';

import NewEditor from './components/newEditor';

interface IEditorProps {
  namespaceId: string;
  resource: Resource;
  onResource: (resource: Resource) => void;
}

export default function Editor(props: IEditorProps) {
  const { resource, onResource, namespaceId } = props;
  const busy = useRef(false);
  const contentRef = useRef<string>('');
  const navigate = useNavigate();
  const { app } = useTheme();
  const [title, onTitle] = useState('');

  // Load cached data on mount
  useEffect(() => {
    const cache = getCache(resource.id);
    const cachedTitle = cache?.title || resource.name || '';
    const cachedContent = cache?.content || resource.content || '';

    onTitle(cachedTitle);
    contentRef.current = cachedContent;
  }, [resource.id, resource.name, resource.content]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  const handleContentChange = useCallback(
    (content: string) => {
      contentRef.current = content;
      updateCacheContent(resource.id, content);
    },
    [resource.id]
  );

  // Save handler
  useEffect(() => {
    return app.on('save', (onSuccess?: () => void) => {
      const name = title.trim();
      const content = contentRef.current;
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
          clearCache(resource.id);
          navigate(`/${namespaceId}/${resource.id}`);
          onSuccess && onSuccess();
        });
    });
  }, [title, namespaceId, resource.id, navigate, app, onResource]);

  // Ctrl+S save shortcut
  useEffect(() => {
    const keydownFN = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const content = contentRef.current;
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
  }, [namespaceId, resource.id]);

  // Get initial content for editor
  const initialContent =
    getCache(resource.id)?.content || resource.content || '';

  return (
    <div className="flex flex-col h-full">
      <Input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div className="flex-1 overflow-hidden">
        <NewEditor
          initialContent={initialContent}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
