// import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PeopleForm() {
  // const [loading, onLoading] = useState(false);

  return (
    <div>
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
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            {
              invoice: 'INV001',
              paymentStatus: 'Paid',
              totalAmount: '$250.00',
              paymentMethod: 'Credit Card',
            },
            {
              invoice: 'INV007',
              paymentStatus: 'Unpaid',
              totalAmount: '$300.00',
              paymentMethod: 'Credit Card',
            },
          ].map((invoice) => (
            <TableRow key={invoice.invoice}>
              <TableCell className="font-medium">{invoice.invoice}</TableCell>
              <TableCell>{invoice.paymentStatus}</TableCell>
              <TableCell>{invoice.paymentMethod}</TableCell>
              <TableCell className="text-right">
                {invoice.totalAmount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
