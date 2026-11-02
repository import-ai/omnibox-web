import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { IconButton } from '@/components/omnibox/IconButton';
import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
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
  const { namespaceId: routeNamespaceId } = useChatRouteParams();
  const namespaceId = routeNamespaceId || params.namespace_id || '';
  const shareId = params.share_id || '';
  const [loading, onLoading] = useState(false);

  const handleCreate = () => {
    if (loading || !namespaceId) return;
    onLoading(true);
    http
      .get(`/namespaces/${namespaceId}/private`)
      .then(privateRoot =>
        http
          .post(`/namespaces/${namespaceId}/resources`, {
            content,
            resourceType: 'doc',
            parentId: privateRoot.id,
            name: getTitleFromConversationDetail(conversation),
          })
          .then(response => {
            app.fire('generate_resource', privateRoot.id, response);
          })
      )
      .finally(() => {
        onLoading(false);
      });
  };

  if (shareId) {
    return null;
  }

  return (
    <IconButton
      size="sm"
      tone="sidebar"
      label={t('chat.messages.actions.save')}
      disabled={loading}
      onClick={handleCreate}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
    </IconButton>
  );
}
