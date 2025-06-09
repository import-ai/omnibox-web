import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConversationSummary } from '@/page/chat/types/conversation';

export default function useContext() {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const [current, onCurrent] = useState(1);
  const [pageSize] = useState(10);
  const [data, onData] = useState<{
    total: number;
    data: ConversationSummary[];
  }>({
    total: 0,
    data: [],
  });
  const [edit, onEdit] = useState<{
    id: string;
    title: string;
    open: boolean;
  }>({
    id: '',
    title: '',
    open: false,
  });
  const [remove, onRemove] = useState<{
    id: string;
    title: string;
    open: boolean;
  }>({
    id: '',
    title: '',
    open: false,
  });
  const refetch = (showLoading?: boolean) => {
    showLoading && onLoading(true);
    http
      .get(
        `/namespaces/${namespaceId}/conversations?offset=${(current - 1) * pageSize}&limit=${pageSize}&order=desc`,
      )
      .then(onData)
      .finally(() => {
        showLoading && onLoading(false);
      });
  };
  const onPagerChange = (page: number) => {
    onCurrent(page);
  };
  const onEditDone = () => {
    onEdit({ id: '', title: '', open: false });
    refetch();
  };
  const onRemoveDone = () => {
    onRemove({ id: '', title: '', open: false });
    refetch();
  };
  const onEditChange = (open: boolean) => {
    onEdit({ ...edit, open });
  };
  const onRemoveChange = (open: boolean) => {
    onRemove({ ...remove, open });
  };

  useEffect(() => {
    refetch(true);
  }, [namespaceId, current, pageSize]);

  return {
    data,
    edit,
    current,
    loading,
    pageSize,
    onEdit,
    remove,
    refetch,
    onRemove,
    onEditDone,
    onEditChange,
    onRemoveDone,
    namespaceId,
    onRemoveChange,
    onPagerChange,
  };
}
