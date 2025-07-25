import WeChat from '../wechat';
import MetaPage from '../meta';
import { useState } from 'react';
import Scan from '../wechat/scan';
import { LoginForm } from './form';
import WrapperPage from '../wrapper';

export default function LoginPage() {
  const [scan, onScan] = useState(false);

  return (
    <WrapperPage extra={<MetaPage />}>
      {scan ? (
        <Scan onScan={onScan} />
      ) : (
        <LoginForm>
          <WeChat onScan={onScan} />
        </LoginForm>
      )}
    </WrapperPage>
  );
}
