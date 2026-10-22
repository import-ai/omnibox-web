import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Button } from '@/components/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';

export default function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md space-y-6 text-center">
        <Alert variant="destructive">
          <AlertTitle>
            {t(notFound ? 'error.title' : 'error.unexpected_title')}
          </AlertTitle>
          <AlertDescription>
            {t(
              notFound
                ? 'error.not_found_description'
                : 'error.unexpected_description'
            )}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <a href="/">{t('back_to_front')}</a>
        </Button>
      </div>
    </div>
  );
}
