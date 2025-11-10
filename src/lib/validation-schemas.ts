import i18next from 'i18next';
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
  .min(8, i18next.t('form.password_min'))
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, i18next.t('form.password_reg'));

/**
 * Optional password schema for update forms
 * Same requirements as passwordSchema, but allows empty strings
 */
export const optionalPasswordSchema = z
  .string()
  .optional()
  .refine(
    password => {
      if (!password || password.length <= 0) {
        return true;
      }
      if (
        password.length < 8 ||
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
      ) {
        return false;
      }
      return true;
    },
    {
      message: i18next.t('form.password_reg'),
    }
  );

/**
 * Schema for forms with password and password confirmation
 */
export function createPasswordWithConfirmSchema() {
  return z
    .object({
      password: passwordSchema,
      password_repeat: z.string(),
    })
    .refine(data => data.password === data.password_repeat, {
      message: i18next.t('form.password_not_match'),
      path: ['password_repeat'],
    });
}
