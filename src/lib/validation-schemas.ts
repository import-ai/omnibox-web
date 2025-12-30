import i18next, { TFunction } from 'i18next';
import { z } from 'zod';

/**
 * Password validation requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 */
export const passwordSchema = z
  .string()
  .min(8, { message: i18next.t('form.password_min') })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: i18next.t('form.password_reg'),
  });

/**
 * Optional password schema for update forms
 * Same requirements as passwordSchema, but allows empty strings
 */
export const optionalPasswordSchema = z
  .string()
  .superRefine((password, ctx) => {
    // Allow empty password
    if (!password || password.length === 0) {
      return;
    }
    // Check password requirements
    if (
      password.length < 8 ||
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18next.t('form.password_reg'),
      });
    }
  });

/**
 * Create password schema with dynamic translation
 * Use this function to get a schema with current language translations
 */
export function createPasswordSchema(t: TFunction) {
  return z
    .string()
    .min(8, { message: t('form.password_min') })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: t('form.password_reg'),
    });
}

/**
 * Create optional password schema with dynamic translation
 * Use this function to get a schema with current language translations
 */
export function createOptionalPasswordSchema(t: TFunction) {
  return z.string().superRefine((password, ctx) => {
    // Allow empty password
    if (!password || password.length === 0) {
      return;
    }
    // Check password requirements
    if (
      password.length < 8 ||
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('form.password_reg'),
      });
    }
  });
}

/**
 * Schema for forms with password and password confirmation
 */
export function createPasswordWithConfirmSchema(t: TFunction) {
  return z
    .object({
      password: createPasswordSchema(t),
      password_repeat: z.string(),
    })
    .refine(data => data.password === data.password_repeat, {
      message: t('form.password_not_match'),
      path: ['password_repeat'],
    });
}
