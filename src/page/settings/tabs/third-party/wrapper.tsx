import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Scan from '@/page/user/wechat/scan';

import { AppleLogin } from './apple';
import { GoogleLogin } from './google';
import { WechatLogin } from './wechat';

interface IProps {
  type: string;
  onSuccess?: () => void;
}

export function Wrapper(props: IProps) {
  const { type, onSuccess } = props;
  const [open, onOpen] = useState(false);

  if (type === 'wechat') {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpen}>
          <DialogContent className="w-[90%] sm:w-1/2 max-w-7xl p-4 sm:p-6">
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <Scan onScan={onOpen} />
          </DialogContent>
        </Dialog>
        <WechatLogin onScan={onOpen} />
      </>
    );
  }

  if (type === 'apple') {
    return <AppleLogin onSuccess={onSuccess} />;
  }

  return <GoogleLogin />;
}
