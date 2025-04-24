import WrapperPage from './wrapper';
import { RegisterForm } from '@/page/user/form/register';

export default function RegisterPage() {
  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your information to create an account
        </p>
      </div>
      <RegisterForm />
    </WrapperPage>
  );
}
