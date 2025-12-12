import { zodResolver } from '@hookform/resolvers/zod';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import i18next from 'i18next';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';

import { DarkMailIcon } from '@/assets/icons/darkMail';
import { MailIcon } from '@/assets/icons/mail';
// import { SmartphoneIcon } from '@/assets/icons/smartphone';
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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import useTheme from '@/hooks/use-theme';
import useUser from '@/hooks/use-user';
import { UserBinding } from '@/interface';
import { isEmoji } from '@/lib/emoji';
import { http } from '@/lib/request';
import { createOptionalPasswordSchema } from '@/lib/validation-schemas';
import { GoogleIcon } from '@/page/user/google/icon';
import { WeChatIcon } from '@/page/user/wechat/icon';

import { Wrapper } from '../third-party/wrapper';
import EmailValidate from './email-validate';
import PhoneValidate from './phone-validate';

// Schema factory for username change dialog
function createUsernameSchema() {
  return z.object({
    username: z
      .string()
      .min(2, i18next.t('form.username_min'))
      .max(32, i18next.t('form.username_max'))
      .refine(
        value => {
          return !Array.from(value).some(char => isEmoji(char));
        },
        {
          message: i18next.t('form.username_no_emoji'),
        }
      ),
  });
}

// Schema factory for password change dialog
function createPasswordChangeSchema() {
  return z.object({
    password: createOptionalPasswordSchema(),
    password_repeat: z.string(),
  });
}

type UsernameFormValues = { username: string };
type PasswordFormValues = { password: string; password_repeat: string };

// Action button wrapper using shadcn Button - FIXED SIZE: 71×30px
// Figma: primary = black bg, white text; secondary = white bg, border, black text
function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'secondary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={isPrimary ? 'default' : 'outline'}
      className={
        isPrimary
          ? 'w-[71px] h-[30px] px-[21px] py-[5px] rounded-[5px] text-sm font-semibold bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-200 shadow-none border-none'
          : 'w-[71px] h-[30px] px-[21px] py-[5px] rounded-[5px] text-sm font-semibold bg-white border-neutral-200 hover:bg-neutral-50 dark:bg-transparent dark:border-neutral-600 dark:text-white dark:hover:bg-neutral-800 shadow-none'
      }
    >
      {children}
    </Button>
  );
}

// Section header with divider - Title: 20px, weight 600, line-height 28px; Divider at 38px from top
function SectionHeader({
  title,
  width = 532,
}: {
  title: string;
  width?: number;
}) {
  return (
    <div className="relative" style={{ height: '48px', width: `${width}px` }}>
      <p
        className="absolute text-foreground whitespace-nowrap"
        style={{
          left: 0,
          top: 0,
          fontFamily: 'Inter, "Noto Sans SC", "Noto Sans JP", sans-serif',
          fontSize: '20px',
          fontWeight: 600,
          lineHeight: '28px',
          letterSpacing: '0px',
        }}
      >
        {title}
      </p>
      {/* Divider line at 38px from top */}
      <Separator
        className="absolute"
        style={{ left: 0, top: '38px', width: `${width}px` }}
      />
    </div>
  );
}

// Info row component for username/password - Figma: flex, items-center, justify-between, h-[30px] to align with button
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
    <div
      className="flex items-center justify-between"
      style={{ width: '533px', height: '30px' }}
    >
      {/* Left side with label and value */}
      <div
        className="flex items-center"
        style={{ height: '24px', width: '411.5px', gap: '12px' }}
      >
        {/* Label */}
        <p
          className="text-foreground whitespace-nowrap flex-shrink-0"
          style={{
            fontFamily: 'Inter, "Noto Sans JP", "Noto Sans SC", sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '24px',
            letterSpacing: '0px',
          }}
        >
          {label}
        </p>
        {/* Value */}
        <p
          className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '0px',
            maxWidth: '333px',
          }}
        >
          {value}
        </p>
      </div>
      {/* Button - fixed 71×30px */}
      <div className="flex-shrink-0">{button}</div>
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
    <div
      className="flex items-center justify-between"
      style={{ width: '532px', height: '30px' }}
    >
      {/* Left side with icon, label, and value */}
      <div
        className="flex items-center"
        style={{ height: '22px', width: '411.5px', gap: '12px' }}
      >
        {/* Icon and label group - gap: 9px */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '9px' }}>
          <span
            className="flex-shrink-0 flex items-center justify-center"
            style={{ width: '20px', height: '20px' }}
          >
            {icon}
          </span>
          <p
            className="text-foreground whitespace-nowrap"
            style={{
              fontFamily: 'Inter, "Noto Sans JP", sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '24px',
              letterSpacing: '0px',
            }}
          >
            {label}
          </p>
        </div>
        {/* Value */}
        <p
          className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '24px',
            letterSpacing: '0px',
            maxWidth: '333px',
          }}
        >
          {value}
        </p>
      </div>
      {/* Button - Figma: both bound and unbound use outline style (white bg, border) */}
      <div className="flex-shrink-0">
        {isBound ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <ActionButton variant="secondary">
                {t('setting.unbind_btn')}
              </ActionButton>
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
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={unbinding}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onUnbind}
                >
                  {unbinding && (
                    <LoaderCircle className="size-4 mr-2 transition-transform animate-spin" />
                  )}
                  {t('setting.third_party_account.confirm_unbind')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          onBind || (
            <ActionButton variant="secondary">
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
  const { theme } = useTheme();
  const isDark =
    theme.skin === 'dark' ||
    (theme.skin === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  // Create schemas dynamically to get current language translations
  const usernameSchema = useMemo(() => createUsernameSchema(), []);
  const passwordSchema = useMemo(() => createPasswordChangeSchema(), []);

  // Forms
  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', password_repeat: '' },
  });

  // Fetch bindings
  const refetchBindings = () => {
    http.get('/user/binding/list').then(response => {
      setBindingData(
        [
          { icon: <GoogleIcon />, login_type: 'google' },
          { icon: <WeChatIcon />, login_type: 'wechat' },
        ].map(item => ({
          ...item,
          ...response.find(
            (i: BindingData) => i.login_type === item.login_type
          ),
        }))
      );
    });
  };

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
    http
      .post(`/${loginType}/unbind`)
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
        <LoaderCircle className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const maskedPassword = '••••••••••••';

  return (
    <div
      className="flex flex-col items-start"
      style={{ width: '533px', gap: '20px' }}
    >
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
      <SectionHeader title={t('setting.binding')} />

      {/* Phone Row - Hidden temporarily, uncomment when phone binding API is ready
      <BindingRow
        icon={<SmartphoneIcon />}
        label={t('setting.phone')}
        value={user?.phone || t('setting.not_bound')}
        isBound={!!user?.phone}
        onBind={
          <ActionButton
            variant="primary"
            onClick={() => setPhoneDialogOpen(true)}
          >
            {t('setting.bind_btn')}
          </ActionButton>
        }
      />
      */}

      {/* Email Row */}
      <div
        className="flex items-center justify-between"
        style={{ width: '532px', height: '30px' }}
      >
        <div
          className="flex items-center"
          style={{ height: '22px', width: '411.5px', gap: '12px' }}
        >
          <div
            className="flex items-center flex-shrink-0"
            style={{ gap: '9px' }}
          >
            <span
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: '20px', height: '20px' }}
            >
              {isDark ? <DarkMailIcon /> : <MailIcon />}
            </span>
            <p
              className="text-foreground whitespace-nowrap"
              style={{
                fontFamily: 'Inter, "Noto Sans JP", sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0px',
              }}
            >
              {t('setting.email_binding')}
            </p>
          </div>
          <p
            className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '24px',
              letterSpacing: '0px',
              maxWidth: '333px',
            }}
          >
            {user?.email || t('setting.not_bound')}
          </p>
        </div>
        <div className="flex-shrink-0">
          <ActionButton onClick={() => setEmailDialogOpen(true)}>
            {t('setting.change')}
          </ActionButton>
        </div>
      </div>

      {/* Google & WeChat Bindings */}
      {bindingData.map(item => (
        <BindingRow
          key={item.login_type}
          icon={item.icon}
          label={t(`setting.third_party_account.${item.login_type}`)}
          value={
            item.id
              ? item.login_type === 'google'
                ? item.metadata?.email || item.email || ''
                : t('setting.third_party_account.bound')
              : t('setting.not_bound')
          }
          isBound={!!item.id}
          onUnbind={() => handleUnbind(item.login_type)}
          onBind={
            <Wrapper type={item.login_type} onSuccess={refetchBindings} />
          }
          unbinding={unbinding}
        />
      ))}

      {/* Username Change Dialog */}
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="w-[90%] sm:w-1/2 max-w-md">
          <DialogHeader>
            <DialogTitle>{t('form.username')}</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>Change your username</DialogDescription>
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
                  onClick={() => setUsernameDialogOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    t('ok')
                  )}
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
              <DialogDescription>Change your password</DialogDescription>
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
                          className="pr-10"
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
                          className="pr-10"
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
                  {submitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    t('ok')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Validation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent
          className="p-0 border-none bg-transparent shadow-none"
          style={{ width: '445px', maxWidth: '445px' }}
        >
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{t('email.validate')}</DialogTitle>
              <DialogDescription>{t('email.description')}</DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          <div
            className="bg-card rounded-[12px] flex items-center justify-center"
            style={{
              width: '445px',
              minHeight: '303px',
              padding: '48px 30px 32px 30px',
            }}
          >
            <EmailValidate onFinish={handleEmailValidateFinish} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Binding Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent
          className="p-0 border-none bg-transparent shadow-none"
          style={{ width: '445px', maxWidth: '445px' }}
        >
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{t('phone.input_phone')}</DialogTitle>
              <DialogDescription>
                {t('phone.will_send_verification')}
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          <div
            className="bg-card rounded-[12px] flex items-center justify-center"
            style={{
              width: '445px',
              minHeight: '303px',
              padding: '48px 30px 32px 30px',
            }}
          >
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
    </div>
  );
}
