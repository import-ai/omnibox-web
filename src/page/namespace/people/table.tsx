import Invite from './invite';
import useContext from './use-context';
import Space from '@/components/space';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PopConfirm from '@/components/popconfirm';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';

export default function PeopleForm() {
  const { data, search, onSearch } = useContext();

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          placeholder="输入用户名查询"
          className="h-8 w-[150px] lg:w-[250px]"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Invite />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">用户名</TableHead>
              <TableHead>邮箱</TableHead>
              {/* <TableHead>角色</TableHead> */}
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.list.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.username}</TableCell>
                <TableCell>{item.email}</TableCell>
                {/* <TableCell>--</TableCell> */}
                <TableCell className="text-right">
                  <Space className="inline-flex">
                    <PopConfirm title="确定禁用当前用户？">
                      <Button size="sm">禁用</Button>
                    </PopConfirm>
                    {/* <PopConfirm title="确定删除当前用户？">
                      <Button size="sm" variant="destructive">
                        删除
                      </Button>
                    </PopConfirm> */}
                    <PopConfirm title="确定移除当前用户？">
                      <Button size="sm" variant="destructive">
                        移除所属空间
                      </Button>
                    </PopConfirm>
                  </Space>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
