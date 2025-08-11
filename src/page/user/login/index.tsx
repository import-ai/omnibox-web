import { useState } from 'react';

import MetaPage from '../meta';
import WeChat from '../wechat';
import Scan from '../wechat/scan';
import WrapperPage from '../wrapper';
import { LoginForm } from './form';

export default function LoginPage() {
  const [scan, onScan] = useState(false);
  const [checked, setChecked] = useState(false);

  return (
    <WrapperPage extra={<MetaPage checked={checked} setChecked={setChecked} />}>
      {scan ? (
        <Scan onScan={onScan} />
      ) : (
        <LoginForm checked={checked}>
          <WeChat checked={checked} onScan={onScan} />
        </LoginForm>
      )}
    </WrapperPage>
  );
}
