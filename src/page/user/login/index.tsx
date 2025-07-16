import MetaPage from './meta';
import Wechat from './wechat';
import WrapperPage from '../wrapper';
import { LoginForm } from '@/page/user/form/login';

export default function LoginPage() {
  return (
    <WrapperPage extra={<MetaPage />}>
      <LoginForm
        extra={
          <>
            <div className="flex flex-col gap-4">
              <Wechat />
            </div>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-white dark:bg-[#171717] text-muted-foreground relative z-10 px-2">
                Or continue with
              </span>
            </div>
          </>
        }
      />
    </WrapperPage>
  );
}
