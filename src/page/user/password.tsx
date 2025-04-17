import WrapperPage from './wrapper';
import { ForgotPasswordForm } from '@/page/user/form/password';

export default function ForgotPasswordPage() {
  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">找回密码</h1>
        <p className="text-sm text-muted-foreground">
          输入您的邮箱地址，我们将向您发送重置密码的链接
        </p>
      </div>
      <ForgotPasswordForm />
    </WrapperPage>
  );
}
