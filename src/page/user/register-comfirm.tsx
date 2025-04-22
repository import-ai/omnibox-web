import WrapperPage from './wrapper';
import { RegisterComFirmForm } from '@/page/user/form/register-comfirm';

export default function RegisterComFirmPage() {
  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">完成创建账号</h1>
        <p className="text-sm text-muted-foreground">
          输入您的信息以完成创建账号
        </p>
      </div>
      <RegisterComFirmForm />
    </WrapperPage>
  );
}
