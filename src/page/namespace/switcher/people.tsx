'use client';

import { useState } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

export default function TeamManagement() {
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-normal text-gray-800">人员</h1>
          <HelpCircle className="w-5 h-5 ml-2 text-gray-400" />
        </div>

        {/* Invitation section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-2">通过邀请链接添加成员</h2>
          <p className="text-gray-600 mb-4">
            只有拥有邀请成员权限的人员才能查看此内容。你也可以创建新链接
          </p>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 text-blue-500 border-blue-100"
            >
              接收链接
            </Button>
            <Switch
              checked={isLinkEnabled}
              onCheckedChange={setIsLinkEnabled}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          {/* Tabs */}
          <div className="flex justify-between items-center">
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="bg-transparent h-auto p-0 mb-4">
                <TabsTrigger
                  value="visitors"
                  className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-gray-300 data-[state=active]:shadow-none rounded-none bg-transparent text-gray-400 data-[state=active]:text-gray-800"
                >
                  访客
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-gray-300 data-[state=active]:shadow-none rounded-none bg-transparent text-gray-400 data-[state=active]:text-gray-800"
                >
                  成员 1
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-gray-300 data-[state=active]:shadow-none rounded-none bg-transparent text-gray-400 data-[state=active]:text-gray-800"
                >
                  联系人
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Button className="bg-blue-500 hover:bg-blue-600">
                添加成员
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 border border-gray-200 rounded-sm">
            {/* Table header */}
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="p-4 font-medium text-gray-500">用户</div>
              <div className="p-4 font-medium text-gray-500 flex justify-between">
                <span>团队协作区</span>
                <span className="text-gray-500">群</span>
              </div>
            </div>

            {/* Table row */}
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className="p-4 flex items-center">
                <Avatar className="w-10 h-10 rounded-full bg-gray-200 mr-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                </Avatar>
                <div>
                  <div className="font-medium">wenguang he</div>
                  <div className="text-gray-500 text-sm">
                    wenguang.fe@gmail.com
                  </div>
                </div>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500">无访问权限</span>
                <span className="text-gray-500">无</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
