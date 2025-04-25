import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function InvitePeople() {
  return (
    <div className="flex justify-between mb-8">
      <div className="flex flex-col">
        <h2 className="font-medium mb-2">Add members via invite link</h2>
        <p className="text-gray-600 text-sm">
          Only members with invite permissions can view this content. You can
          also create a new link.
        </p>
      </div>
      <div className="flex items-center gap-2 justify-between">
        <Button size="sm" variant="secondary">
          Receive Link
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
