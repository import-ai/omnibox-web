import WrapperPage from './wrapper';
import { ForgotPasswordForm } from '@/page/user/form/password-comfirm';

export default function ForgotPasswordPage() {
  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your information to complete reset password
        </p>
      </div>
      <ForgotPasswordForm />
    </WrapperPage>
  );
}
