import { Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import type { ConversationDetail } from '@/page/chat/types/conversation';
import { getTitleFromConversationDetail } from '@/page/chat/utils';

interface IProps {
  content: string;
  conversation: ConversationDetail;
}

export default function SaveMain(props: IProps) {
  const { content, conversation } = props;
  const app = useApp();
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const handleCreate = () => {
    onLoading(true);
    http
      .get(`/namespaces/${namespaceId}/private`)
      .then(privateRoot => {
        return http
          .post(`/namespaces/${namespaceId}/resources`, {
            content,
            resourceType: 'file',
            parentId: privateRoot.id,
            namespaceId: namespaceId,
            name: getTitleFromConversationDetail(conversation),
          })
          .then(response => {
            app.fire('generate_resource', privateRoot.id, response);
          });
      })
      .finally(() => {
        onLoading(false);
      });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          loading={loading}
          className="p-0 w-7 h-7"
          onClick={handleCreate}
        >
          <Save />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('chat.save_to_private')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
