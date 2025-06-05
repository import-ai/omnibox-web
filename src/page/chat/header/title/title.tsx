import EditForm from './edit';
import useApp from '@/hooks/use-app';
import { Edit } from 'lucide-react';
import Space from '@/components/space';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface ITitleProps {
  namespaceId: string;
  conversationId: string;
}

interface IProps extends ITitleProps {
  editable: boolean;
  data: string;
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
  const onEditDone = () => {
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
    <Space className="items-center gap-0 group">
      <span>{data}</span>
      {editable && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onEditTitle}
          className="p-0 w-6 h-6 hidden group-hover:flex"
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
