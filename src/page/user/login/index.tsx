import { useState } from 'react';

import MetaPage from '../meta';
import WeChat from '../wechat';
import Scan from '../wechat/scan';
import WrapperPage from '../wrapper';
import { LoginForm } from './form';

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
