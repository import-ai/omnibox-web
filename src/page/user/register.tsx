import WrapperPage from './wrapper';
import { RegisterForm } from '@/page/user/form/register';

export default function RegisterPage() {
  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">创建账号</h1>
        <p className="text-sm text-muted-foreground">输入您的信息以创建账号</p>
      </div>
      <RegisterForm />
    </WrapperPage>
  );
}
