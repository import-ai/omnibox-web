import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import MoveTo from '@/page/resource/actions/move';
import {
  getDescendantIds,
  getTopLevelSelectedIds,
  useNode,
  useSidebarStore,
} from '@/page/sidebar/store';

import { MoveConfirmDialog } from './moveConfirmDialog';

interface BatchMoveDialogProps {
  open: boolean;
  selectedIds: string[];
  selectedCount: number;
  namespaceId: string;
  loading?: boolean;
  onConfirm: (targetId: string) => Promise<void>;
  onCancel: () => void;
}

export default function BatchMoveDialog({
  open,
  selectedIds,
  selectedCount,
  namespaceId,
  loading = false,
  onConfirm,
  onCancel,
}: BatchMoveDialogProps) {
  const { t } = useTranslation();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetName, setTargetName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const targetNode = useNode(targetId || '');
  const nodes = useSidebarStore(state => state.nodes);
  const disabledTargetIds = useMemo(() => {
    const ids = new Set<string>();
    const sourceIds = getTopLevelSelectedIds(nodes, selectedIds);
    for (const sourceId of sourceIds) {
      ids.add(sourceId);
      for (const descendantId of getDescendantIds(nodes, sourceId)) {
        ids.add(descendantId);
      }
    }
    return Array.from(ids);
  }, [nodes, selectedIds]);

  const handleCancel = () => {
    setTargetId(null);
    setTargetName('');
    setConfirmOpen(false);
    onCancel();
  };

  const handleFinalConfirm = async () => {
    if (!targetId) return;
    await onConfirm(targetId);
    setTargetId(null);
    setTargetName('');
    setConfirmOpen(false);
  };

  return (
    <>
      {!confirmOpen && (
        <MoveTo
          open={open}
          resourceIds={selectedIds}
          namespaceId={namespaceId}
          showDisabledTargets
          disabledTargetIds={disabledTargetIds}
          disabledTargetTooltip={t('batch.operating_resource')}
          onOpenChange={handleCancel}
          onFinished={(_, nextTargetId, nextTargetName) => {
            setTargetId(nextTargetId);
            setTargetName(nextTargetName || '');
            setConfirmOpen(true);
          }}
        />
      )}
      <MoveConfirmDialog
        open={confirmOpen}
        count={selectedCount}
        targetName={targetNode?.name || targetName || t('untitled')}
        loading={loading}
        onConfirm={handleFinalConfirm}
        onOpenChange={open => {
          if (!open) {
            handleCancel();
            return;
          }
          setConfirmOpen(open);
        }}
      />
    </>
  );
}
