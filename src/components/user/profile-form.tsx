import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: '用户名至少2个字符',
    })
    .max(30, {
      message: '用户名最多30个字符',
    }),
  email: z
    .string({
      required_error: '请选择一个邮箱地址',
    })
    .email(),
  bio: z.string().max(160).min(4),
  urls: z
    .array(
      z.object({
        value: z.string().url({ message: '请输入有效的URL' }),
      })
    )
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// 这里我们模拟一些默认值
const defaultValues: Partial<ProfileFormValues> = {
  username: 'shadcn',
  email: 'm@example.com',
  bio: 'I own a computer.',
  urls: [{ value: 'https://shadcn.com' }],
};

export function ProfileForm() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    console.log(data);
    try {
      // TODO: 实现更新个人信息的API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('个人资料已更新');
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                这是你的公开显示名称。你每30天只能更改一次。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个验证过的邮箱" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="m@example.com">m@example.com</SelectItem>
                  <SelectItem value="m2@example.com">m2@example.com</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                你可以在邮箱设置中管理验证过的邮箱地址。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>个人简介</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="介绍一下自己..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>你可以@提及其他用户和组织。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} loading={isLoading}>
          更新个人资料
        </Button>
      </form>
    </Form>
  );
}
