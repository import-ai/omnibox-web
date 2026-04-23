// import { Link } from 'react-router-dom';
// import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  // CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <div className="mt-20 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex justify-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="size-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            {t('unauth_page.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('unauth_page.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t('unauth_page.alert_title')}</AlertTitle>
            <AlertDescription> {t('unauth_page.alert_desc')}</AlertDescription>
          </Alert>
          <div className="text-sm text-muted-foreground">
            <p>{t('unauth_page.reason')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t('unauth_page.reason1')}</li>
              <li>{t('unauth_page.reason2')}</li>
              <li>{t('unauth_page.reason3')}</li>
            </ul>
          </div>
        </CardContent>
        {/* <CardFooter>
          <div className="w-full space-y-2">
            <Button className="w-full">Request Access</Button>
            <Link to="/" className="block w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardFooter> */}
      </Card>
    </div>
  );
}
