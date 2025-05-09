import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function Action() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="flex items-center text-gray-700">
          <span>全部权限</span>
          <ChevronDown className="h-5 w-5 ml-1" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        alignOffset={-10}
        className="w-[264px]"
      >
        <DropdownMenuItem className="cursor-pointer justify-between hover:bg-gray-100">
          <div>
            <div>
              <div className="font-medium text-gray-900">全部权限</div>
              <div className="text-gray-500 text-xs">
                编辑、建议、评论以及与他人分享
              </div>
            </div>
          </div>
          <Check className="h-5 w-5 text-blue-600" />
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer justify-between hover:bg-gray-100">
          <div>
            <div className="font-medium text-gray-900 flex items-center">
              可以编辑
              <span className="ml-2 text-blue-500 text-xs">PLUS 版 ↗</span>
            </div>
            <div className="text-gray-500 text-xs">编辑、建议和评论</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer justify-between hover:bg-gray-100">
          <div>
            <div className="font-medium text-gray-900">可以评论</div>
            <div className="text-gray-500 text-xs">建议和评论</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer justify-between hover:bg-gray-100">
          可以查看
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-500 cursor-pointer justify-between hover:bg-gray-100">
          移除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
