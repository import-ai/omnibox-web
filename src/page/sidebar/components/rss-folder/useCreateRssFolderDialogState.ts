import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useRssFolderLimits from '@/hooks/useRssFolderLimits';
import { NamespaceTier } from '@/interface';
import { hasSiblingNameConflict } from '@/page/sidebar/components/smart-folder/createSmartFolderDialogHelpers';

import type {
  CreateRssFolderDialogProps,
  CreateRssFolderPayload,
  RssLinkRow,
} from './index';

export const MAX_RSS_FOLDER_NAME_LENGTH = 128;

function createEmptyRow(): RssLinkRow {
  return { url: '', name: '' };
}

function normalizeInitialRows(
  initialValue?: CreateRssFolderPayload | null
): RssLinkRow[] {
  if (!initialValue?.links?.length) {
    return [createEmptyRow()];
  }
  return initialValue.links.map(link => ({
    url: link.url,
    name: link.name || '',
  }));
}

function getDialogSnapshot(name: string, rows: RssLinkRow[]) {
  return JSON.stringify({
    name,
    rows: rows.map(row => ({ url: row.url, name: row.name })),
  });
}

function isValidFeedUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function useCreateRssFolderDialogState({
  open,
  onOpenChange,
  onConfirm,
  currentResourceId,
  initialValue,
  siblingResources,
  title,
  currentNamespace,
}: CreateRssFolderDialogProps) {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id;
  const { data: limits } = useRssFolderLimits({ namespaceId });
  const inputRef = useRef<HTMLInputElement>(null);
  const linkListRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatestLinkRef = useRef(false);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<RssLinkRow[]>([createEmptyRow()]);
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const initialSnapshotRef = useRef('');
  const initializedDialogKeyRef = useRef('');
  // Maps payload link indices (returned by the backend on validation errors)
  // back to their source row indices, since empty rows are dropped.
  const payloadRowIndicesRef = useRef<number[]>([]);

  const resolvedTier =
    limits?.tier ??
    (currentNamespace?.tier === NamespaceTier.PREMIUM ? 'premium' : 'basic');
  const maxLinkCount =
    limits?.linkLimit ?? (resolvedTier === 'premium' ? 10 : 1);
  const remainingLinkCount = Math.max(maxLinkCount - rows.length, 0);
  const showUpgradeButton = resolvedTier === 'basic';
  const canAddLink = rows.length < maxLinkCount;
  const disableAddMessage = t(
    resolvedTier === 'basic'
      ? 'rss_folder.create.limit_reached_basic'
      : 'rss_folder.create.limit_reached_premium',
    { limit: maxLinkCount }
  );
  const canSubmit = !!name.trim() && rows.some(row => row.url.trim());

  useEffect(() => {
    if (!open) {
      initializedDialogKeyRef.current = '';
      return;
    }

    const initialRows = normalizeInitialRows(initialValue);
    const initialName = initialValue?.name || '';
    const initialValueKey = initialValue
      ? getDialogSnapshot(initialName, initialRows)
      : 'create';
    if (initializedDialogKeyRef.current === initialValueKey) {
      return;
    }
    initializedDialogKeyRef.current = initialValueKey;

    setName(initialName);
    setRows(initialRows);
    setNameError('');
    setConfirmCloseOpen(false);
    initialSnapshotRef.current = getDialogSnapshot(initialName, initialRows);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [open, initialValue]);

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    setNameError(
      nextName.trim().length > MAX_RSS_FOLDER_NAME_LENGTH
        ? t('rss_folder.validation.name_too_long')
        : ''
    );
  };

  useEffect(() => {
    if (!shouldScrollToLatestLinkRef.current) {
      return;
    }

    shouldScrollToLatestLinkRef.current = false;
    window.requestAnimationFrame(() => {
      const list = linkListRef.current;
      if (list && list.scrollHeight > list.clientHeight) {
        list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
      }
    });
  }, [rows]);

  const addLink = () => {
    if (!canAddLink) {
      return;
    }

    shouldScrollToLatestLinkRef.current = true;
    setRows(prev =>
      prev.length < maxLinkCount ? [...prev, createEmptyRow()] : prev
    );
  };

  const removeLink = (index: number) => {
    setRows(prev =>
      prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : prev
    );
  };

  const handleLinkUrlChange = (index: number, url: string) => {
    setRows(prev =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, url, error: undefined } : row
      )
    );
  };

  const handleLinkNameChange = (index: number, linkName: string) => {
    setRows(prev =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, name: linkName } : row
      )
    );
  };

  const validate = (): CreateRssFolderPayload | null => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('rss_folder.validation.name_required'));
      return null;
    }
    if (trimmedName.length > MAX_RSS_FOLDER_NAME_LENGTH) {
      setNameError(t('rss_folder.validation.name_too_long'));
      return null;
    }
    if (
      hasSiblingNameConflict(siblingResources, trimmedName, currentResourceId)
    ) {
      setNameError(t('rss_folder.validation.name_exists'));
      return null;
    }
    setNameError('');

    // Every link row must contain a non-empty, valid URL. Empty rows are no
    // longer silently dropped — they block saving and surface an inline error
    // so the user removes or fills them.
    const rowErrors = rows.map(row => {
      const url = row.url.trim();
      if (!url) {
        return t('rss_folder.validation.url_required');
      }
      if (!isValidFeedUrl(url)) {
        return t('rss_folder.validation.invalid_url');
      }
      return undefined;
    });
    if (rowErrors.some(Boolean)) {
      setRows(prev =>
        prev.map((row, index) => ({ ...row, error: rowErrors[index] }))
      );
      return null;
    }

    payloadRowIndicesRef.current = rows.map((_, index) => index);
    return {
      name: trimmedName,
      links: rows.map(row => ({
        url: row.url.trim(),
        name: row.name.trim() || undefined,
      })),
    };
  };

  const handleConfirm = async () => {
    const payload = validate();
    if (!payload) {
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(payload);
      closeDialog();
    } catch (error) {
      applyFeedErrors(error);
      // Keep dialog open when request fails.
    } finally {
      setSubmitting(false);
    }
  };

  const applyFeedErrors = (error: unknown) => {
    const response = (
      error as {
        response?: { data?: { code?: string; failed?: { index: number }[] } };
      }
    )?.response?.data;
    if (response?.code !== 'rss_feed_invalid' || !response.failed?.length) {
      return;
    }

    const failedRowIndices = new Set(
      response.failed
        .map(({ index }) => payloadRowIndicesRef.current[index])
        .filter(rowIndex => rowIndex !== undefined)
    );
    setRows(prev =>
      prev.map((row, rowIndex) =>
        failedRowIndices.has(rowIndex)
          ? { ...row, error: t('rss_folder.validation.invalid_feed') }
          : row
      )
    );
  };

  const dialogTitle = useMemo(
    () => title || t('rss_folder.create.title'),
    [t, title]
  );

  const hasUnsavedChanges =
    getDialogSnapshot(name, rows) !== initialSnapshotRef.current;

  const closeDialog = () => {
    setConfirmCloseOpen(false);
    onOpenChange(false);
  };

  const handleRequestClose = () => {
    if (submitting) {
      return;
    }

    if (!hasUnsavedChanges) {
      closeDialog();
      return;
    }

    setConfirmCloseOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    handleRequestClose();
  };

  return {
    t,
    namespaceId,
    inputRef,
    linkListRef,
    name,
    rows,
    nameError,
    submitting,
    confirmCloseOpen,
    setConfirmCloseOpen,
    maxLinkCount,
    remainingLinkCount,
    showUpgradeButton,
    canAddLink,
    disableAddMessage,
    canSubmit,
    addLink,
    removeLink,
    handleLinkUrlChange,
    handleLinkNameChange,
    handleConfirm,
    dialogTitle,
    closeDialog,
    handleRequestClose,
    handleDialogOpenChange,
    handleNameChange,
  };
}
