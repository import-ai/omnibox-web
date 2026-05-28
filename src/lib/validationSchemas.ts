import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
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

/**
 * Phone number validation schema
 * - Validates phone number format using libphonenumber-js
 * - For Chinese numbers, only allows mobile phone prefixes (13x-19x)
 */
export const phoneSchema = z
  .string()
  .min(1, 'form.phone_required')
  .refine(val => isValidPhoneNumber(val || ''), {
    message: 'form.phone_invalid',
  })
  .refine(
    val => {
      const parsed = parsePhoneNumberFromString(val || '');
      // If it's not a Chinese number, allow it
      if (parsed?.country !== 'CN') return true;

      // Chinese mobile numbers: 11 digits starting with 1[3-9]
      const nationalNumber = parsed?.nationalNumber || '';
      return /^1[3-9]\d{9}$/.test(nationalNumber);
    },
    { message: 'form.phone_invalid' }
  );
