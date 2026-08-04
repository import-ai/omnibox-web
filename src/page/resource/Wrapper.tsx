import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/userResource';
import AuthPage from '@/page/auth';

import Page from './Page';

interface IProps extends IUseResource {
  onRssItemCopyContentChange?: (value: {
    itemId: string;
    content: string | null | undefined;
  }) => void;
}

export default function Wrapper(props: IProps) {
  const {
    loading,
    forbidden,
    notFound,
    resource,
    editPage,
    onResource,
    namespaceId,
    onRssItemCopyContentChange,
  } = props;

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthPage forbidden={forbidden} notFound={notFound} resource={resource}>
      {resource && (
        <Page
          editPage={editPage}
          resource={resource}
          onResource={onResource}
          namespaceId={namespaceId}
          onRssItemCopyContentChange={onRssItemCopyContentChange}
        />
      )}
    </AuthPage>
  );
}
