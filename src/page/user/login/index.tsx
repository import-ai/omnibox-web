import WeChat from '../wechat';
import MetaPage from '../meta';
import { useState } from 'react';
import Scan from '../wechat/scan';
import { LoginForm } from './form';
import WrapperPage from '../wrapper';

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
