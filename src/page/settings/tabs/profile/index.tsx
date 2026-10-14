import { zodResolver } from '@hookform/resolvers/zod';
import { CircleHelp, Eye, EyeOff } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

import { AppleIcon } from '@/assets/icons/AppleIcon';
import { GoogleIcon } from '@/assets/icons/GoogleIcon';
import { MailIcon } from '@/assets/icons/MailIcon';
import { SmartphoneIcon } from '@/assets/icons/SmartphoneIcon';
import { WeChatIcon } from '@/assets/icons/Wechat';
import { Input } from '@/components/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Spinner';
import useUser from '@/hooks/useUser';
import { UserBinding } from '@/interface';
import { isEmoji } from '@/lib/emoji';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils.ts';
import { optionalPasswordSchema } from '@/lib/validationSchemas';
import { useSettingsToast } from '@/page/settings/SettingsToastProvider';

import { DeleteAccountDialog } from '../account/DeleteAccountDialog';
import EmailValidate from '../account/EmailValidate';
import PhoneValidate from '../account/PhoneValidate';
import { Wrapper } from '../third-party/Wrapper';

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

function SectionHeader({
  title,
  className,
  tooltip,
}: {
  title: string;
  className?: string;
  tooltip?: string;
}) {
  return (
    <div
      className={cn(
        'w-full border-b pb-2 text-base font-semibold text-foreground',
        tooltip && 'flex items-center gap-1',
        className
      )}
    >
      {title}
      {tooltip && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-5 p-0 hover:bg-transparent"
                type="button"
              >
                <CircleHelp className="size-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  description,
  button,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  description: string;
  button: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid w-full items-center gap-2 px-2 py-2',
        icon
          ? 'grid-cols-[24px_minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)_auto]'
      )}
    >
      {icon && (
        <span className="flex size-4 items-center justify-center text-muted-foreground [&>svg]:size-4">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-medium leading-5 text-foreground">
            {label}
          </p>
          {value != null && (
            <p className="min-w-0 break-words text-sm font-normal leading-5 text-muted-foreground">
              {value}
            </p>
          )}
        </div>
        <p className="whitespace-normal text-xs leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
      {button}
    </div>
  );
}

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
    <InfoRow
      icon={icon}
      label={label}
      value={value}
      description={t('setting.option_descriptions.third_party', {
        provider: label,
      })}
      button={
        isBound ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <SettingPageButton variant="outline">
                {t('setting.unbind_btn')}
              </SettingPageButton>
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
                <AlertDialogCancel className="cancel-btn-outline">
                  {t('cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={unbinding}
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
            <SettingPageButton>{t('setting.bind_btn')}</SettingPageButton>
          )
        )
      }
    />
  );
}

interface BindingData extends UserBinding {
  icon: React.ReactNode;
  connected: boolean;
}

interface ProfileFormProps {
  autoAction?:
    | {
        type: 'bind';
        appId: string;
      }
    | {
        type: 'bind_phone';
      };
}

export default function ProfileForm({ autoAction }: ProfileFormProps) {
  const { showToast } = useSettingsToast();
  const { t } = useTranslation();
  const { user, onChange, loading, refetch } = useUser();

  // Dialog states
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoActionProcessedRef = useRef(false);

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
    autoActionProcessedRef.current = false;
  }, [autoAction]);

  useEffect(() => {
    if (autoAction?.type === 'bind_phone' && !autoActionProcessedRef.current) {
      autoActionProcessedRef.current = true;
      setPhoneDialogOpen(true);
    }
  }, [autoAction]);

  useEffect(() => {
    if (user) {
      usernameForm.setValue('username', user.username || '');
    }
  }, [user]);

  // Handle username change
  const handleUsernameSubmit = async (data: UsernameFormValues) => {
    if (!data.username.trim().length) {
      showToast(t('form.username_not_emptyStr'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await onChange({ username: data.username }, () => {
        showToast(t('profile.success'), 'success');
      });
      setUsernameDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    if (data.password !== data.password_repeat) {
      showToast(t('form.password_not_match'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await onChange({ password: data.password }, () => {
        showToast(t('profile.success'), 'success');
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
        showToast(t('profile.success'), 'success');
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
        showToast(t('setting.third_party_account.unbind_success'), 'success');
      })
      .finally(() => {
        setUnbinding(false);
      });
  };

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const maskedPassword = '********';

  return (
    <div className="flex w-full flex-col items-start gap-2">
      {/* Account Section Header */}
      <SectionHeader title={t('setting.account')} />

      {/* Username Row */}
      <InfoRow
        label={t('form.username')}
        value={user?.username || ''}
        description={t('setting.option_descriptions.username')}
        button={
          <SettingPageButton
            variant="outline"
            onClick={() => setUsernameDialogOpen(true)}
          >
            {t('setting.change')}
          </SettingPageButton>
        }
      />

      {/* Password Row */}
      <InfoRow
        label={t('form.password')}
        value={maskedPassword}
        description={t('setting.option_descriptions.password')}
        button={
          <SettingPageButton
            variant="outline"
            onClick={() => setPasswordDialogOpen(true)}
          >
            {t('setting.change')}
          </SettingPageButton>
        }
      />

      {/* Binding Section Header */}
      <SectionHeader
        title={t('setting.binding')}
        className="mt-4"
        tooltip={t('setting.binding_tooltip')}
      />

      <InfoRow
        icon={<SmartphoneIcon />}
        label={t('setting.phone')}
        value={phoneBinding?.login_id || t('setting.not_bound')}
        description={t('setting.option_descriptions.phone')}
        button={
          <SettingPageButton
            variant={phoneBinding?.id ? 'outline' : 'default'}
            onClick={() => setPhoneDialogOpen(true)}
          >
            {t(phoneBinding?.id ? 'setting.change' : 'setting.bind_btn')}
          </SettingPageButton>
        }
      />
      <InfoRow
        icon={<MailIcon className="text-blue-400" />}
        label={t('setting.email_binding')}
        value={user?.email || t('setting.not_bound')}
        description={t('setting.option_descriptions.email')}
        button={
          <SettingPageButton
            variant="outline"
            onClick={() => setEmailDialogOpen(true)}
          >
            {t('setting.change')}
          </SettingPageButton>
        }
      />

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
        <DialogContent className="w-[90%] max-w-md sm:max-w-md sm:w-1/2">
          <DialogHeader>
            <DialogTitle>{t('form.username')}</DialogTitle>
            <VisuallyHidden.Root>
              <DialogDescription>
                {t('form.change_username_desc')}
              </DialogDescription>
            </VisuallyHidden.Root>
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
                      <Input {...field} disabled={submitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUsernameDialogOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting} size="sm">
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
        <DialogContent className="w-[90%] max-w-md sm:max-w-md sm:w-1/2">
          <DialogHeader>
            <DialogTitle>{t('form.password')}</DialogTitle>
            <VisuallyHidden.Root>
              <DialogDescription>
                {t('form.change_password_desc')}
              </DialogDescription>
            </VisuallyHidden.Root>
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
                          className="border-line pr-10 shadow-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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
                          className="border-line pr-10 shadow-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswordRepeat(!showPasswordRepeat)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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
                  size="sm"
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    passwordForm.reset();
                    setShowPassword(false);
                    setShowPasswordRepeat(false);
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting} size="sm">
                  {submitting ? <Spinner /> : t('ok')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Validation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="w-[90%] max-w-[445px] sm:max-w-[445px] border-none bg-transparent p-0 shadow-none lg:w-[445px]">
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle>{t('email.validate')}</DialogTitle>
              <DialogDescription>{t('email.description')}</DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>
          <div className="flex min-h-[280px] w-full items-center justify-center rounded-[12px] bg-background p-6 lg:min-h-[303px] lg:p-[48px_30px_32px_30px]">
            <EmailValidate onFinish={handleEmailValidateFinish} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Binding Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="w-[90%] max-w-[445px] sm:max-w-[445px] border-none bg-transparent p-0 shadow-none dark:bg-transparent lg:w-[445px]">
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle>{t('phone.input_phone')}</DialogTitle>
              <DialogDescription>
                {t('phone.will_send_verification')}
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>
          <div className="flex min-h-[280px] w-full items-center justify-center rounded-[12px] bg-background p-6 lg:min-h-[303px] lg:p-[48px_30px_32px_30px]">
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
        className="mt-4 text-destructive"
      />
      <InfoRow
        label={t('setting.delete_account.section_title')}
        description={t('setting.delete_account.section_description')}
        button={
          <DeleteAccountDialog
            username={user?.username || ''}
            trigger={
              <SettingPageButton variant="destructive">
                {t('setting.delete_account.button')}
              </SettingPageButton>
            }
          />
        }
      />
    </div>
  );
}
