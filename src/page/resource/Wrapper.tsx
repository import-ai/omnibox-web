import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { IUseResource } from '@/hooks/userResource';
import AuthPage from '@/page/auth';

import Page from './Page';

interface IProps extends IUseResource {
  error?: boolean;
  scrollToLine?: number;
  showToc: boolean;
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
    error,
    showToc,
    scrollToLine,
    wide,
  } = props;

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ResourceLoadError />;
  }

  return (
    <AuthPage forbidden={forbidden} notFound={notFound} resource={resource}>
      {resource && (
        <Page
          editPage={editPage}
          resource={resource}
          onResource={onResource}
          namespaceId={namespaceId}
          showToc={showToc}
          scrollToLine={scrollToLine}
          wide={wide}
        />
      )}
    </AuthPage>
  );
}

function ResourceLoadError() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      {t('copilot.preview_error')}
    </div>
  );
}
