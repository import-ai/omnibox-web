import { z } from 'zod';

/**
 * Password validation requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 *
 * Uses i18n keys that are translated by FormMessage
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'form.password_min' })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'form.password_reg',
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
        message: 'form.password_reg',
      });
    }
  });

/**
 * Schema for forms with password and password confirmation
 */
export const passwordWithConfirmSchema = z
  .object({
    password: passwordSchema,
    password_repeat: z.string(),
  })
  .refine(data => data.password === data.password_repeat, {
    message: 'form.password_not_match',
    path: ['password_repeat'],
  });
