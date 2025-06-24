import { Clock, List, Link } from 'lucide-react';

export default function Component() {
  return (
    <div className="max-w-2xl p-6 bg-white">
      <div className="space-y-4">
        {/* Created row */}
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600 font-medium min-w-[80px]">
            Created
          </span>
          <span className="text-gray-800">2021年9月3日 13:52</span>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-3">
          <List className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600 font-medium min-w-[80px]">Tags</span>
          <span className="text-gray-800">空白</span>
        </div>

        {/* URL row */}
        <div className="flex items-center gap-3">
          <Link className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600 font-medium min-w-[80px]">URL</span>
          <span className="text-gray-800 break-all">
            mp.weixin.qq.com/s/W...bQl97g
          </span>
        </div>
      </div>
    </div>
  );
}
