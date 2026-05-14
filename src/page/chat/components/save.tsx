import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import type { ConversationDetail } from '@/page/chat/core/types/conversation';
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
  const uid = localStorage.getItem('uid');

  const saveToNamespace = (targetNamespaceId: string, name?: string) => {
    if (!targetNamespaceId) {
      onLoading(false);
      return;
    }

    http
      .get(`/namespaces/${targetNamespaceId}/private`)
      .then(privateRoot =>
        http
          .post(`/namespaces/${targetNamespaceId}/resources`, {
            content,
            resourceType: 'doc',
            parentId: privateRoot.id,
            name,
          })
          .then(response => {
            app.fire('generate_resource', privateRoot.id, response);
          })
      )
      .finally(() => {
        onLoading(false);
      });
  };

  const handleCreate = () => {
    onLoading(true);

    if (!namespaceId) {
      http
        .get('namespaces')
        .then(list => {
          const targetNamespaceId = Array.isArray(list) ? list[0]?.id : '';
          saveToNamespace(
            targetNamespaceId,
            getTitleFromConversationDetail(conversation)
          );
        })
        .catch(() => {
          onLoading(false);
        });
      return;
    }

    // Ensure the title is correct
    http
      .get(`/namespaces/${namespaceId}/conversations/${conversation.id}`)
      .then(conversationDetail => {
        saveToNamespace(
          namespaceId,
          getTitleFromConversationDetail(conversationDetail)
        );
      })
      .catch(() => {
        onLoading(false);
      });
  };

  if (!uid) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="p-0 w-7 h-7"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('chat.messages.actions.save')}</p>
      </TooltipContent>
    </Tooltip>
  );
}
