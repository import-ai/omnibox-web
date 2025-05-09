import Action from './action';
import InviteForm from './invite';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ShareForm() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="share">
      <TabsList className="w-full justify-start h-11 bg-white border-b rounded-none px-5">
        <TabsTrigger
          value="share"
          className="flex-1 h-11 max-w-[50px] data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          {t('share')}
        </TabsTrigger>
        {/* <TabsTrigger
          value="publish"
          className="flex-1 h-11 max-w-[50px] text-gray-400 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
        >
          发布
        </TabsTrigger> */}
      </TabsList>
      <TabsContent value="share" className="p-4">
        <InviteForm />
        <div className="space-y-4 text-sm">
          <div className="flex items-center p-2 -m-2 rounded-sm transition-all justify-between cursor-pointer hover:bg-gray-100">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-full">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-gray-200">WH</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center">
                  <span className="font-medium">wenguang he</span>
                  <span className="text-gray-500 ml-2">(你)</span>
                </div>
                <div className="text-gray-500 text-sm">
                  wenguang.fe@gmail.com
                </div>
              </div>
            </div>
            <Action />
          </div>
          {/* <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                <img
                  src="/placeholder.svg?height=24&width=24"
                  alt="Roadmap"
                  className="h-6 w-6"
                />
              </div>
              <div>
                <div className="font-medium">受邀访问 Roadmap</div>
                <div className="text-gray-500 text-sm">2 人</div>
              </div>
            </div>
            <div className="flex items-center text-gray-700">
              <span>混合访问权限</span>
              <ChevronRight className="h-5 w-5 ml-1" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-orange-100 flex items-center justify-center">
                <div className="text-orange-500 text-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
              </div>
              <div>
                <div className="font-medium">OmniBox的人员</div>
                <div className="text-gray-500 text-sm">团队协作区 · 9 人</div>
              </div>
            </div>
            <div className="flex items-center text-gray-700">
              <span>全部权限</span>
              <ChevronRight className="h-5 w-5 ml-1" />
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-gray-500 text-sm mb-3">通用访问权限</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                I
              </div>
              <div className="font-medium">Import AI 中的所有人</div>
            </div>
            <div className="flex items-center">
              <div className="flex items-center text-gray-700">
                <span>全部权限</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </div>
            </div>
          </div> */}
        </div>
        {/* <div className="flex justify-between items-center mt-8 pt-4 border-t">
          <Button
            variant="ghost"
            className="text-gray-500 flex items-center gap-1"
          >
            <CircleHelp className="h-4 w-4" />
            了解共享
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 flex items-center gap-1"
          >
            <Link className="h-4 w-4" />
            拷贝链接
          </Button>
        </div> */}
      </TabsContent>
      {/* <TabsContent value="publish"></TabsContent> */}
    </Tabs>
  );
}
