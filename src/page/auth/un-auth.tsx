// import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  // CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';

export default function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center mt-20">
      <Card className="max-w-md w-full">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {t('unauth_page.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('unauth_page.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('unauth_page.alert_title')}</AlertTitle>
            <AlertDescription> {t('unauth_page.alert_desc')}</AlertDescription>
          </Alert>
          <div className="text-sm text-muted-foreground">
            <p>{t('unauth_page.reason')}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
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
