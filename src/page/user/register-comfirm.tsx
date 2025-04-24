import WrapperPage from './wrapper';
import { RegisterComFirmForm } from '@/page/user/form/register-comfirm';

export default function RegisterComFirmPage() {
  return (
    <WrapperPage>
      <div className="flex flex-col space-y-2 text-center mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete Account Creation
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your information to complete account creation
        </p>
      </div>
      <RegisterComFirmForm />
    </WrapperPage>
  );
}
