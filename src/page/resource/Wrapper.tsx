import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/userResource';
import AuthPage from '@/page/auth';

import Page from './Page';

interface IProps extends IUseResource {
  onRssItemCopyContentChange?: (value: {
    itemId: string;
    content: string | null | undefined;
  }) => void;
  wide: boolean;
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
    wide,
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
          wide={wide}
          onRssItemCopyContentChange={onRssItemCopyContentChange}
        />
      )}
    </AuthPage>
  );
}
