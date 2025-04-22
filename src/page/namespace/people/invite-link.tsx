import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function InvitePeople() {
  return (
    <div className="flex justify-between mb-8">
      <div className="flex flex-col">
        <h2 className="font-medium mb-2">通过邀请链接添加成员</h2>
        <p className="text-gray-600 text-sm">
          只有拥有邀请成员权限的人员才能查看此内容。你也可以创建新链接
        </p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <Button size="sm" variant="secondary">
          接收链接
        </Button>
        <Switch
          // checked={isLinkEnabled}
          // onCheckedChange={setIsLinkEnabled}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
}
