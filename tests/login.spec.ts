import { expect, test } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/login');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill in the email field
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');

    // Fill in the password field
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');

    // Click the login button (submit button, not WeChat)
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Wait for navigation away from login page
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Verify we're no longer on the login page
    expect(page.url()).not.toContain('/user/login');
  });

  test('should show validation error for invalid email domain', async ({
    page,
  }) => {
    // Fill in an email with invalid domain
    await page.getByPlaceholder(/email/i).fill('test@invalid.com');

    // Fill in a valid password
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');

    // Click the login button (submit button, not WeChat)
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Check for toast notification about email domain restriction
    await expect(page.locator('[data-sonner-toast]')).toBeVisible();
  });

  test('should show validation error for weak password', async ({ page }) => {
    // Fill in a valid email
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');

    // Fill in a weak password
    await page.getByPlaceholder(/password/i).fill('weak');

    // Try to submit the form
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Check for password validation error
    await expect(page.locator('text=/password.*8/i')).toBeVisible();
  });
});
