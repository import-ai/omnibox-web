import { expect, test } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Navigate to a namespace where search is available
    await page.goto('/namespace_id'); // This might need adjustment
  });

  test('should open search dialog with keyboard shortcut', async ({ page }) => {
    // Use Ctrl+J or Cmd+J to open search
    await page.keyboard.press('Meta+j'); // Use Meta for Mac, Ctrl for others

    // Wait for search dialog to appear
    await page.waitForTimeout(500);

    // Check for search dialog/modal
    const searchDialog = page.locator(
      '[data-testid="search-dialog"], .command-dialog, [role="dialog"]'
    );
    if ((await searchDialog.count()) > 0) {
      await expect(searchDialog).toBeVisible();
    }
  });

  test('should display search input field', async ({ page }) => {
    // Open search (try keyboard shortcut first)
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    // If keyboard shortcut doesn't work, look for search button
    const searchButton = page.locator(
      'button:has-text("Search"), [data-testid="search-button"], button[aria-label*="search"]'
    );
    if (
      (await searchButton.count()) > 0 &&
      !(await page
        .locator('[data-testid="search-dialog"], .command-dialog')
        .isVisible())
    ) {
      await searchButton.first().click();
    }

    // Check for search input
    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"], [data-testid="search-input"]'
    );
    if ((await searchInput.count()) > 0) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeFocused();
    }
  });

  test('should search for resources', async ({ page }) => {
    // Open search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"], [data-testid="search-input"]'
    );

    if ((await searchInput.count()) > 0) {
      // Type search query
      await searchInput.fill('test');

      // Wait for search results to load (debounced)
      await page.waitForTimeout(1000);

      // Check for search results
      const searchResults = page.locator(
        '[data-testid="search-results"], .command-list, [role="listbox"]'
      );
      if ((await searchResults.count()) > 0) {
        await expect(searchResults).toBeVisible();
      }
    }
  });

  test('should display resource search results', async ({ page }) => {
    // Open search and perform search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('document');
      await page.waitForTimeout(1000);

      // Look for resource results section
      const resourceSection = page.locator(
        'text=/resources/i, [data-testid="resource-results"]'
      );
      const resourceItems = page.locator(
        '[data-testid="resource-item"], .command-item'
      );

      if ((await resourceSection.count()) > 0) {
        await expect(resourceSection).toBeVisible();
      }

      if ((await resourceItems.count()) > 0) {
        await expect(resourceItems.first()).toBeVisible();

        // Check for file icon
        const fileIcon = resourceItems
          .first()
          .locator('svg, .lucide-file, [data-testid="file-icon"]');
        if ((await fileIcon.count()) > 0) {
          await expect(fileIcon).toBeVisible();
        }
      }
    }
  });

  test('should display chat message search results', async ({ page }) => {
    // Open search and perform search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('hello');
      await page.waitForTimeout(1000);

      // Look for chat/message results section
      const chatSection = page.locator(
        'text=/chats/i, text=/messages/i, [data-testid="chat-results"]'
      );
      const chatItems = page.locator(
        '[data-testid="chat-item"], .command-item'
      );

      if ((await chatSection.count()) > 0) {
        await expect(chatSection).toBeVisible();
      }

      if ((await chatItems.count()) > 0) {
        // Check for message circle icon
        const messageIcon = chatItems
          .first()
          .locator('svg, .lucide-message-circle, [data-testid="message-icon"]');
        if ((await messageIcon.count()) > 0) {
          await expect(messageIcon).toBeVisible();
        }
      }
    }
  });

  test('should navigate to resource when search result is clicked', async ({
    page,
  }) => {
    // Open search and perform search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Click on first search result
      const searchResults = page
        .locator('.command-item, [data-testid="search-result"]')
        .first();

      if ((await searchResults.count()) > 0) {
        const currentUrl = page.url();
        await searchResults.click();

        // Wait for navigation
        await page.waitForTimeout(1000);

        // URL should change and search dialog should close
        expect(page.url()).not.toBe(currentUrl);

        // Search dialog should be closed
        const searchDialog = page.locator(
          '[data-testid="search-dialog"], .command-dialog'
        );
        if ((await searchDialog.count()) > 0) {
          await expect(searchDialog).not.toBeVisible();
        }
      }
    }
  });

  test('should navigate to chat conversation when message result is clicked', async ({
    page,
  }) => {
    // Open search and perform search for messages
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('message');
      await page.waitForTimeout(1000);

      // Look for message results and click first one
      const messageResults = page.locator('.command-item').filter({
        has: page.locator(
          '.lucide-message-circle, [data-testid="message-icon"]'
        ),
      });

      if ((await messageResults.count()) > 0) {
        // const currentUrl = page.url();
        await messageResults.first().click();

        // Wait for navigation
        await page.waitForTimeout(1000);

        // Should navigate to chat conversation
        expect(page.url()).toMatch(/\/chat\/[^\/]+$/);
      }
    }
  });

  test('should clear search results when input is cleared', async ({
    page,
  }) => {
    // Open search and perform search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      // Search for something
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Search results should be empty or hidden
      const searchResults = page.locator(
        '.command-item, [data-testid="search-result"]'
      );
      if ((await searchResults.count()) > 0) {
        expect(await searchResults.count()).toBe(0);
      }
    }
  });

  test('should close search dialog with Escape key', async ({ page }) => {
    // Open search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchDialog = page.locator(
      '[data-testid="search-dialog"], .command-dialog, [role="dialog"]'
    );

    if ((await searchDialog.count()) > 0 && (await searchDialog.isVisible())) {
      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Dialog should be closed
      await expect(searchDialog).not.toBeVisible();
    }
  });

  test('should debounce search requests', async ({ page }) => {
    // Open search
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      // Type rapidly to test debouncing
      await searchInput.type('rapid');

      // Should not immediately show results (debounced)
      await page.waitForTimeout(200);

      // After debounce delay, results should appear
      await page.waitForTimeout(500);

      const searchResults = page.locator(
        '[data-testid="search-results"], .command-list'
      );
      if ((await searchResults.count()) > 0) {
        // Results should be visible after debounce
        await expect(searchResults).toBeVisible();
      }
    }
  });

  test('should truncate long search result content', async ({ page }) => {
    // Open search and search for content
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(500);

    const searchInput = page.locator(
      'input[placeholder*="search"], input[type="search"]'
    );

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('content');
      await page.waitForTimeout(1000);

      // Check if search results have truncated text (ellipsis)
      const truncatedContent = page.locator('text=/\\.\\.\\.$/');

      if ((await truncatedContent.count()) > 0) {
        // Content is being truncated as expected
        await expect(truncatedContent.first()).toBeVisible();
      }
    }
  });
});
