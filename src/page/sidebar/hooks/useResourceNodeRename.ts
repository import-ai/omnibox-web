import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import useApp from '@/hooks/useApp';
import type { Resource } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import type { TreeNode } from '@/page/sidebar/store/types';

const FOCUS_DELAY = 50;
const BLUR_ENABLE_DELAY = 200;

interface UseResourceNodeRenameOptions {
  isEditing: boolean;
  node: TreeNode;
  nodeId: string;
  sourceResourceId?: string;
}

/** Owns the inline rename lifecycle for a resource tree row. */
export function useResourceNodeRename({
  isEditing,
  node,
  nodeId,
  sourceResourceId,
}: UseResourceNodeRenameOptions) {
  const app = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const isBlurEnabledRef = useRef(false);
  const isEditingRef = useRef(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    setEditName(node.name || '');
  }, [node.name]);

  const startRename = useCallback(() => {
    useSidebarStore.getState().setRenamingId(nodeId);
  }, [nodeId]);

  const handleSave = useCallback(async () => {
    if (!isEditingRef.current) return;
    isBlurEnabledRef.current = false;
    isEditingRef.current = false;
    const trimmedName = editName.trim();
    useSidebarStore.getState().setRenamingId(null);
    const renameId = sourceResourceId || nodeId;
    if (trimmedName && trimmedName !== node.name) {
      try {
        await useSidebarStore.getState().rename(renameId, trimmedName);
        if (sourceResourceId) {
          useSidebarStore.getState().patch(nodeId, { name: trimmedName });
          app.fire('refresh_smart_folder_children', node.parentId);
        }
        app.fire('update_resource', {
          id: renameId,
          name: trimmedName,
        } as unknown as Resource);
      } catch {
        setEditName(node.name || '');
      }
    } else {
      setEditName(node.name || '');
    }
  }, [app, editName, node.name, node.parentId, nodeId, sourceResourceId]);

  useEffect(() => {
    if (!isEditing) return;

    isBlurEnabledRef.current = false;
    const focusTimer = window.setTimeout(() => {
      if (inputRef.current && isEditingRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, FOCUS_DELAY);
    const blurTimer = window.setTimeout(() => {
      if (isEditingRef.current) isBlurEnabledRef.current = true;
    }, BLUR_ENABLE_DELAY);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(blurTimer);
      isBlurEnabledRef.current = false;
    };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      setEditName(node.name || '');
      return;
    }
    isBlurEnabledRef.current = false;
    isEditingRef.current = false;
    setEditName(node.name || '');
  }, [isEditing, node.name]);

  const handleBlur = () => {
    if (isEditing && isBlurEnabledRef.current) handleSave();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      isBlurEnabledRef.current = false;
      isEditingRef.current = false;
      useSidebarStore.getState().setRenamingId(null);
      setEditName(node.name || '');
    }
  };

  return {
    editName,
    handleBlur,
    handleKeyDown,
    inputRef,
    setEditName,
    startRename,
  };
}
