import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@/components/ui/select';

export default function Switcher() {
  const [isOpen, setIsOpen] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('workspace-owner');

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold mb-4">邀请成员</h2>

        {/* Instructions */}
        <p className="text-gray-600 mb-6">
          在下方输入或粘贴电子邮件地址，以英文逗号分隔
        </p>

        {/* Email input */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">电子邮件地址</label>
          <Input
            placeholder="搜索名称或电子邮件地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-gray-300 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          />
        </div>

        {/* Role selector */}
        <div className="mb-8">
          <label className="block text-gray-700 mb-2">角色</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full border-gray-300 text-gray-700 h-10 rounded-md">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace-owner">工作空间所有者</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="member">成员</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Send invitation button */}
        <div className="flex justify-end">
          <Button className="bg-blue-200 hover:bg-blue-300 text-blue-800 font-medium px-6 py-2 rounded-md">
            发送邀请
          </Button>
        </div>
      </div>
    </div>
  );
}
