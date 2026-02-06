import { zodResolver } from '@hookform/resolvers/zod';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import { AppleIcon } from '@/assets/icons/apple';
import { MailIcon } from '@/assets/icons/email';
import { GoogleIcon } from '@/assets/icons/google';
import { SmartphoneIcon } from '@/assets/icons/smartphone';
import { WeChatIcon } from '@/assets/icons/wechat';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import useUser from '@/hooks/use-user';
import { UserBinding } from '@/interface';
import { isEmoji } from '@/lib/emoji';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils.ts';
import { optionalPasswordSchema } from '@/lib/validation-schemas';

import { Wrapper } from '../third-party/wrapper';
import { DeleteAccountDialog } from './delete-account-dialog';
import EmailValidate from './email-validate';
import PhoneValidate from './phone-validate';

// Schema for username change dialog
const usernameSchema = z.object({
  username: z
    .string()
    .min(2, 'form.username_min')
    .max(32, 'form.username_max')
    .refine(
      value => {
        return !Array.from(value).some(char => isEmoji(char));
      },
      {
        message: 'form.username_no_emoji',
      }
    ),
});

// Schema for password change dialog
const passwordChangeSchema = z.object({
  password: optionalPasswordSchema,
  password_repeat: z.string(),
});

type UsernameFormValues = { username: string };
type PasswordFormValues = { password: string; password_repeat: string };

const ActionButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'destructive';
  }
>(function ActionButton(
  { children, onClick, disabled, variant = 'outline' },
  ref
) {
  const className =
    'w-[71px] h-[30px] px-[21px] py-[5px] rounded-[5px] dark:border-neutral-700 border-neutral-200 text-sm font-semibold';
  return (
    <Button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      className={className}
    >
      {children}
    </Button>
  );
});

function SectionHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full pb-2 border-b text-foreground whitespace-nowrap lg:text-xl font-semibold',
        className
      )}
    >
      {title}
    </div>
  );
}

function InfoRow({
  label,
  value,
  button,
}: {
  label: string;
  value: string;
  button: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between w-full lg:w-[533px] h-[30px]">
      <div className="flex items-center h-[24px] flex-1 min-w-0 gap-2 lg:gap-3">
        <p className="text-foreground whitespace-nowrap flex-shrink-0 text-sm lg:text-base font-semibold">
          {label}
        </p>
        <p className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap text-sm lg:text-base flex-1 min-w-0">
          {value}
        </p>
      </div>
      <div className="flex-shrink-0 ml-2">{button}</div>
    </div>
  );
}

// Binding info row with icon - Figma: w-[532px], h-[30px] to align with button, icon 20x20, gap 9px
function BindingRow({
  icon,
  label,
  value,
  isBound,
  onUnbind,
  onBind,
  unbinding,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isBound: boolean;
  onUnbind?: () => void;
  onBind?: React.ReactNode;
  unbinding?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between w-full lg:w-[532px] h-[30px]">
      {/* Left side with icon, label, and value */}
      <div className="flex items-center h-[22px] flex-1 min-w-0 gap-2 lg:gap-3">
        {/* Icon and label group - gap: 9px */}
        <div className="flex items-center flex-shrink-0 gap-2">
          <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">
            {icon}
          </span>
          <p className="text-foreground whitespace-nowrap text-sm lg:text-base font-semibold">
            {label}
          </p>
        </div>
        {/* Value */}
        <p className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis text-sm lg:text-base flex-1 min-w-0">
          {value}
        </p>
      </div>
      {/* Button - Figma: both bound and unbound use outline style (white bg, border) */}
      <div className="flex-shrink-0 ml-2">
        {isBound ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <ActionButton>{t('setting.unbind_btn')}</ActionButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('setting.third_party_account.confirm_unbind')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('setting.third_party_account.confirm_unbind_description', {
                    type: label,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-line">
                  {t('cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={unbinding}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onUnbind}
                >
                  {unbinding && <Spinner className="mr-2" />}
                  {t('setting.third_party_account.confirm_unbind')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          onBind || (
            <ActionButton variant="outline">
              {t('setting.bind_btn')}
            </ActionButton>
          )
        )}
      </div>
    </div>
  );
}

interface BindingData extends UserBinding {
  icon: React.ReactNode;
  connected: boolean;
}

export default function ProfileForm() {
  const { t } = useTranslation();
  const { user, onChange, loading, refetch } = useUser();

  // Dialog states
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Binding states
  const [bindingData, setBindingData] = useState<BindingData[]>([]);
  const [unbinding, setUnbinding] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);

  // Forms
  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: '', password_repeat: '' },
  });

  // Fetch bindings
  const refetchBindings = () => {
    http.get('/user/binding/list').then(response => {
      setBindingData(
        [
          { icon: <SmartphoneIcon />, login_type: 'phone' },
          { icon: <WeChatIcon />, login_type: 'wechat' },
          { icon: <GoogleIcon />, login_type: 'google' },
          { icon: <AppleIcon />, login_type: 'apple' },
        ].map(item => ({
          ...item,
          ...response.find(
            (i: BindingData) => i.login_type === item.login_type
          ),
        }))
      );
    });
  };

  // Get phone binding from bindingData
  const phoneBinding = bindingData.find(b => b.login_type === 'phone');

  useEffect(() => {
    refetchBindings();
  }, []);

  useEffect(() => {
    if (user) {
      usernameForm.setValue('username', user.username || '');
    }
  }, [user]);

  // Handle username change
  const handleUsernameSubmit = async (data: UsernameFormValues) => {
    if (!data.username.trim().length) {
      toast.error(t('form.username_not_emptyStr'), {
        position: 'bottom-right',
      });
      return;
    }
    setSubmitting(true);
    try {
      await onChange({ username: data.username }, () => {
        toast.success(t('profile.success'), { position: 'bottom-right' });
      });
      setUsernameDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    if (data.password !== data.password_repeat) {
      toast.error(t('form.password_not_match'), { position: 'bottom-right' });
      return;
    }
    setSubmitting(true);
    try {
      await onChange({ password: data.password }, () => {
        toast.success(t('profile.success'), { position: 'bottom-right' });
      });
      setPasswordDialogOpen(false);
      passwordForm.reset();
    } finally {
      setSubmitting(false);
    }
  };

  // Handle email validation finish
  const handleEmailValidateFinish = async (
    email: string,
    code: string
  ): Promise<void> => {
    const uid = localStorage.getItem('uid');
    return http
      .patch(`/user/${uid}`, {
        email,
        code,
        username: user?.username || '',
        password: '',
        password_repeat: '',
      })
      .then(() => {
        toast.success(t('profile.success'), { position: 'bottom-right' });
        setEmailDialogOpen(false);
        refetch();
      });
  };

  // Handle unbind
  const handleUnbind = (loginType: string) => {
    setUnbinding(true);
    // Phone unbind uses a different endpoint under /user
    const unbindUrl =
      loginType === 'phone' ? '/user/phone/unbind' : `/${loginType}/unbind`;
    http
      .post(unbindUrl)
      .then(() => {
        refetchBindings();
        toast(t('setting.third_party_account.unbind_success'), {
          position: 'bottom-right',
        });
      })
      .finally(() => {
        setUnbinding(false);
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }

  const maskedPassword = '********';

  return (
    <div className="flex flex-col items-start w-full lg:w-[533px] gap-4 lg:gap-5">
      {/* Account Section Header */}
      <SectionHeader title={t('setting.account')} />

      {/* Username Row */}
      <InfoRow
        label={t('form.username')}
        value={user?.username || ''}
        button={
          <ActionButton onClick={() => setUsernameDialogOpen(true)}>
            {t('setting.change')}
          </ActionButton>
        }
      />

      {/* Password Row */}
      <InfoRow
        label={t('form.password')}
        value={maskedPassword}
        button={
          <ActionButton onClick={() => setPasswordDialogOpen(true)}>
            {t('setting.change')}
          </ActionButton>
        }
      />

      {/* Binding Section Header */}
      <SectionHeader title={t('setting.binding')} className="mt-4" />

      {/* Phone Row */}
      <div className="flex items-center justify-between w-full lg:w-[532px] h-[30px]">
        <div className="flex items-center h-[22px] flex-1 min-w-0 gap-2 lg:gap-3">
          <div className="flex items-center flex-shrink-0 gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">
              <SmartphoneIcon />
            </span>
            <p className="text-foreground whitespace-nowrap text-sm lg:text-base font-semibold">
              {t('setting.phone')}
            </p>
          </div>
          <p className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis text-sm lg:text-base flex-1 min-w-0">
            {phoneBinding?.login_id
              ? phoneBinding.login_id
              : t('setting.not_bound')}
          </p>
        </div>
        <div className="flex-shrink-0 ml-2">
          <ActionButton onClick={() => setPhoneDialogOpen(true)}>
            {phoneBinding?.id ? t('setting.change') : t('setting.bind_btn')}
          </ActionButton>
        </div>
      </div>

      {/* Email Row */}
      <div className="flex items-center justify-between w-full lg:w-[532px] h-[30px]">
        <div className="flex items-center h-[22px] flex-1 min-w-0 gap-2 lg:gap-3">
          <div className="flex items-center flex-shrink-0 gap-2">
            <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 text-blue-400">
              <MailIcon />
            </span>
            <p className="text-foreground whitespace-nowrap text-sm lg:text-base font-semibold">
              {t('setting.email_binding')}
            </p>
          </div>
          <p className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis text-sm lg:text-base flex-1 min-w-0">
            {user?.email || t('setting.not_bound')}
          </p>
        </div>
        <div className="flex-shrink-0 ml-2">
          <ActionButton onClick={() => setEmailDialogOpen(true)}>
            {t('setting.change')}
          </ActionButton>
        </div>
      </div>

      {/* WeChat, Google & Apple Bindings */}
      {bindingData
        .filter(item => item.login_type !== 'phone')
        .map(item => {
          let displayValue = t('setting.not_bound');
          if (item.id) {
            if (item.login_type === 'wechat') {
              displayValue =
                item.metadata?.nickname ||
                t('setting.third_party_account.bound');
            } else if (
              item.login_type === 'google' ||
              item.login_type === 'apple'
            ) {
              displayValue = item.metadata?.email || item.email || '';
            } else {
              displayValue = t('setting.third_party_account.bound');
            }
          }

          return (
            <BindingRow
              key={item.login_type}
              icon={item.icon}
              label={t(`setting.third_party_account.${item.login_type}`)}
              value={displayValue}
              isBound={!!item.id}
              onUnbind={() => handleUnbind(item.login_type)}
              onBind={
                <Wrapper type={item.login_type} onSuccess={refetchBindings} />
              }
              unbinding={unbinding}
            />
          );
        })}

      {/* Username Change Dialog */}
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="w-[90%] sm:w-1/2 max-w-md">
          <DialogHeader>
            <DialogTitle>{t('form.username')}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>
                {t('form.change_username_desc')}
              </DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <Form {...usernameForm}>
            <form
              onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)}
              className="space-y-4"
            >
              <FormField
                control={usernameForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={submitting}
                        className="border-line"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="dark:border-neutral-700 border-neutral-200"
                  onClick={() => setUsernameDialogOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner /> : t('ok')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onOpenChange={open => {
          setPasswordDialogOpen(open);
          if (!open) {
            passwordForm.reset();
            setShowPassword(false);
            setShowPasswordRepeat(false);
          }
        }}
      >
        <DialogContent className="w-[90%] sm:w-1/2 max-w-md">
          <DialogHeader>
            <DialogTitle>{t('form.password')}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>
                {t('form.change_password_desc')}
              </DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...field}
                          disabled={submitting}
                          className="border-line shadow-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="password_repeat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.confirm_password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPasswordRepeat ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...field}
                          disabled={submitting}
                          className="border-line shadow-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswordRepeat(!showPasswordRepeat)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPasswordRepeat ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="dark:border-neutral-700 border-neutral-200"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    passwordForm.reset();
                    setShowPassword(false);
                    setShowPasswordRepeat(false);
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner /> : t('ok')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Validation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none w-[90%] lg:w-[445px] max-w-[445px]">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{t('email.validate')}</DialogTitle>
              <DialogDescription>{t('email.description')}</DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          <div className="bg-background rounded-[12px] flex items-center justify-center w-full min-h-[280px] lg:min-h-[303px] p-6 lg:p-[48px_30px_32px_30px]">
            <EmailValidate onFinish={handleEmailValidateFinish} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Binding Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none w-[90%] lg:w-[445px] max-w-[445px] dark:bg-transparent">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{t('phone.input_phone')}</DialogTitle>
              <DialogDescription>
                {t('phone.will_send_verification')}
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          <div className="bg-background rounded-[12px] flex items-center justify-center w-full min-h-[280px] lg:min-h-[303px] p-6 lg:p-[48px_30px_32px_30px]">
            <PhoneValidate
              currentPhone={user?.phone}
              onFinish={() => {
                setPhoneDialogOpen(false);
                // Refresh user data to show updated phone
                window.location.reload();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Danger Zone Section */}
      <SectionHeader
        title={t('setting.danger_zone')}
        className="text-destructive mt-4"
      />
      <div className="flex items-center justify-between w-full lg:w-[533px] h-[30px]">
        <div className="flex items-center h-[24px] flex-1 min-w-0 gap-2 lg:gap-3">
          <p className="text-foreground whitespace-nowrap flex-shrink-0 text-sm lg:text-base font-semibold">
            {t('setting.delete_account.section_title')}
          </p>
          <p className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap text-sm lg:text-base flex-1 min-w-0">
            {t('setting.delete_account.section_description')}
          </p>
        </div>
        <div className="flex-shrink-0 ml-2">
          <DeleteAccountDialog username={user?.username || ''} />
        </div>
      </div>
    </div>
  );
}
