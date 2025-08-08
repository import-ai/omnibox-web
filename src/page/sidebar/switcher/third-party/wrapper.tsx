import { useState } from 'react';
import { WechatLogin } from './wechat';
import { GoogleLogin } from './google';
import Scan from '@/page/user/wechat/scan';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface IProps {
  type: string;
  onSuccess: () => void;
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

  return <GoogleLogin onSuccess={onSuccess} />;
}
