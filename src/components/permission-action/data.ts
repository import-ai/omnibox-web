import { Permission } from '@/interface';

export function getData(): Array<{
  value: Permission;
  label: string;
  description?: string;
}> {
  return [
    {
      value: 'full_access',
      label: '全部权限',
      description: '编辑、建议、评论以及与他人分享',
    },
    {
      value: 'can_edit',
      label: '可以编辑',
    },
    {
      value: 'can_comment',
      label: '可以评论',
      description: '建议和评论',
    },
    {
      value: 'can_view',
      label: '可以查看',
    },
  ];
}
