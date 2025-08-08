import { toast } from 'sonner';
import { Wrapper } from './wrapper';
import { http } from '@/lib/request';
import { UserBinding } from '@/interface';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/page/user/google/icon';
import { WeChatIcon } from '@/page/user/wechat/icon';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Link, Unlink, LoaderCircle } from 'lucide-react';

interface IData extends UserBinding {
  icon: React.ReactNode;
  connected: boolean;
}

export function ThirdPartyForm() {
  const [data, onData] = useState<IData[]>([]);
  const { t } = useTranslation();
  const [unbinding, onunbingding] = useState(false);
  const refetch = () => {
    http.get('/user/binding/list').then(response => {
      onData(
        [
          { icon: <GoogleIcon />, login_type: 'google' },
          { icon: <WeChatIcon />, login_type: 'wechat' },
        ].map(item => ({
          ...item,
          ...response.find((i: IData) => i.login_type === item.login_type),
        }))
      );
    });
  };

  useEffect(refetch, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col mb-4 gap-2">
        <h2 className="font-medium">
          {t('setting.third_party_account.title')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('setting.third_party_account.description')}
        </p>
      </div>
      <Separator className="mb-4" />
      {data.map((item: IData) => (
        <Card key={item.login_type}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-lg [&_svg]:size-4">
                  {item.icon}
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">
                    {t(`setting.third_party_account.${item.login_type}`)}
                  </h4>
                  {item.id ? (
                    <Badge variant="secondary" className="text-green-600">
                      <Link className="size-3 mr-1" />
                      {t('setting.third_party_account.binded')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-red-600">
                      <Unlink className="size-3 mr-1" />
                      {t('setting.third_party_account.unbinding')}
                    </Badge>
                  )}
                </div>
              </div>
              {item.id ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      {t('setting.third_party_account.unbind')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('setting.third_party_account.confirm_unbind')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          'setting.third_party_account.confirm_unbind_description',
                          { login_type: item.login_type }
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={unbinding}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          onunbingding(true);
                          http
                            .post(`/${item.login_type}/unbind`)
                            .then(() => {
                              refetch();
                              toast(
                                t('setting.third_party_account.unbind_success'),
                                { position: 'bottom-right' }
                              );
                            })
                            .finally(() => {
                              onunbingding(false);
                            });
                        }}
                      >
                        {unbinding && (
                          <LoaderCircle className="size-4 mr-2 transition-transform animate-spin" />
                        )}
                        {t('setting.third_party_account.confirm_unbind')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Wrapper type={item.login_type} onSuccess={refetch} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
