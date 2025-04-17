import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpCircle } from 'lucide-react';

export default function WorkspaceSettings() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-medium mb-6">工作空间设置</h1>

      <div className="border-t border-gray-200 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">名称</h2>
          <Input
            className="max-w-xl mb-2"
            defaultValue="wenguang he的 Notion"
          />
          <p className="text-gray-500 text-sm">
            你可以使用你的组织或公司名称，保持简洁。
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">图标</h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-md border border-gray-200">
              <span className="text-5xl text-gray-500">W</span>
            </div>
            <div className="mt-2">
              <p className="text-gray-700">
                上传图片或选择表情符号。图表将显示在侧边栏和通知中。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">导出内容</h2>
          <Button
            variant="outline"
            className="bg-white text-black border-gray-200 hover:bg-gray-50"
          >
            导出所有工作空间内容
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-200 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">危险区域</h2>
          <Button
            variant="outline"
            className="bg-white text-red-500 border-red-200 hover:bg-red-50"
          >
            删除整个工作空间
          </Button>
          <div className="flex items-center gap-1 mt-4 text-gray-500">
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm">了解删除工作空间</span>
          </div>
        </div>
      </div>
    </div>
  );
}
