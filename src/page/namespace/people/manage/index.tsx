import Invite from '../invite';
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

export default function ManagePeople() {
  const { data, search, onSearch, onDisable, onRemove } = useContext();

  return (
    <div className="space-y-4 p-px">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search by username"
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
              <TableHead className="w-[20%]">Username</TableHead>
              <TableHead>Email</TableHead>
              {/* <TableHead>角色</TableHead> */}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.username}</TableCell>
                <TableCell>{item.email}</TableCell>
                {/* <TableCell>--</TableCell> */}
                <TableCell className="text-right">
                  <Space className="inline-flex">
                    <PopConfirm
                      title="Are you sure to disable this user?"
                      onOk={() => onDisable(item.id)}
                    >
                      <Button size="sm">Disable</Button>
                    </PopConfirm>
                    {/* <PopConfirm title="确定删除当前用户？">
                      <Button size="sm" variant="destructive">
                        删除
                      </Button>
                    </PopConfirm> */}
                    <PopConfirm
                      title="Are you sure to remove this user from the workspace?"
                      onOk={() => onRemove(item.id)}
                    >
                      <Button size="sm" variant="destructive">
                        Remove from Workspace
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
