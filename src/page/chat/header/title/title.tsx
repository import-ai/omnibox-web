import { Edit } from 'lucide-react';
import { useEffect, useState } from 'react';

import Space from '@/components/space';
import { Button } from '@/components/ui/button';
import useApp from '@/hooks/use-app';

import EditForm from './edit';

export interface ITitleProps {
  data: string;
  namespaceId: string;
  conversationId: string;
}

interface IProps extends ITitleProps {
  editable: boolean;
}

export default function HeaderTitle(props: IProps) {
  const { data, editable, namespaceId, conversationId } = props;
  const app = useApp();
  const [edit, onEdit] = useState<{
    id: string;
    title: string;
    open: boolean;
  }>({
    id: '',
    title: '',
    open: false,
  });
  const onEditDone = (val: string) => {
    app.fire('chat:title:update', val);
    onEdit({ id: '', title: '', open: false });
  };
  const onEditChange = (open: boolean) => {
    onEdit({ ...edit, open });
  };
  const onEditTitle = () => {
    onEdit({
      id: conversationId,
      title: data,
      open: true,
    });
  };

  useEffect(() => {
    return app.on('chat:title:edit', onEditTitle);
  }, []);

  useEffect(() => {
    if (edit.title && edit.title !== data) {
      onEdit({
        ...edit,
        title: data,
      });
    }
  }, [data, edit]);

  return (
    <Space className="group items-center gap-0">
      <span className="line-clamp-1 max-w-[400px]">{data}</span>
      {editable && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onEditTitle}
          className="hidden size-6 p-0 group-hover:flex"
        >
          <Edit />
        </Button>
      )}
      <EditForm
        data={edit}
        onFinish={onEditDone}
        namespaceId={namespaceId}
        onOpenChange={onEditChange}
      />
    </Space>
  );
}
