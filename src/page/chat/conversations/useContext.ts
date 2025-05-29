import { http } from '@/lib/request';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Conversation } from '@/page/chat/interface';

export default function useContext() {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const [data, onData] = useState<Array<Conversation>>([]);
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
    open: boolean;
  }>({
    id: '',
    open: false,
  });
  const refetch = () => {
    http.get(`/namespaces/${namespaceId}/conversations`).then(onData);
  };
  const onEditDone = () => {
    onEdit({ id: '', title: '', open: false });
    refetch();
  };
  const onRemoveDone = () => {
    onRemove({ id: '', open: false });
    refetch();
  };
  const onEditChange = (open: boolean) => {
    onEdit({ ...edit, open });
  };
  const onRemoveChange = (open: boolean) => {
    onRemove({ ...remove, open });
  };

  useEffect(refetch, [namespaceId]);

  return {
    data,
    edit,
    onEdit,
    remove,
    refetch,
    onRemove,
    onEditDone,
    onEditChange,
    onRemoveDone,
    namespaceId,
    onRemoveChange,
  };
}
