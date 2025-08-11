import { useState } from 'react';

import MetaPage from '../meta';
import WeChat from '../wechat';
import Scan from '../wechat/scan';
import WrapperPage from '../wrapper';
import { RegisterForm } from './form';

export default function RegisterPage() {
  const [scan, onScan] = useState(false);

  return (
    <WrapperPage extra={<MetaPage />}>
      {scan ? (
        <Scan onScan={onScan} />
      ) : (
        <RegisterForm>
          <WeChat onScan={onScan} />
        </RegisterForm>
      )}
    </WrapperPage>
  );
}
