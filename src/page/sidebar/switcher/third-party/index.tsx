import { toast } from 'sonner';
import { Wrapper } from './wrapper';
import { http } from '@/lib/request';
import { UserBinding } from '@/interface';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { X, Unlink, LoaderCircle, CheckCircle } from 'lucide-react';

interface IData extends UserBinding {
  icon: React.ReactNode;
  connected: boolean;
}

export function ThirdPartyForm() {
  const [data, onData] = useState<IData[]>([]);
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
        <h2 className="font-medium">第三方账号管理</h2>
        <p className="text-muted-foreground text-sm">
          管理你的第三方账号绑定，用于快速登录
        </p>
      </div>
      <Separator className="mb-4" />
      {data.map((item: IData) => (
        <Card key={item.login_type}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg [&_svg]:size-4">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{item.login_type}</h4>
                    {item.id ? (
                      <Badge variant="secondary" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已绑定
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-red-600">
                        <X className="h-3 w-3 mr-1" />
                        未绑定
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {item.id ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Unlink className="size-4 mr-2" />
                      解绑
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认解绑账号</AlertDialogTitle>
                      <AlertDialogDescription>
                        你确定要解绑 {item.login_type}
                        账号吗？解绑后将无法使用该账号登录。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={unbinding}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          onunbingding(true);
                          http
                            .post(`/${item.login_type}/unbind`)
                            .then(() => {
                              refetch();
                              toast('已成功解绑', { position: 'bottom-right' });
                            })
                            .finally(() => {
                              onunbingding(false);
                            });
                        }}
                      >
                        {unbinding && (
                          <LoaderCircle className="size-4 mr-2 transition-transform animate-spin" />
                        )}
                        确认解绑
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
