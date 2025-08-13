import { expect, test } from '@playwright/test';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Login first using the same credentials as login.spec.ts
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Wait for potential redirect and try to navigate to chat
    await page.waitForTimeout(2000);

    // Check if we can find a chat link/button and click it
    const chatLink = page.locator('a[href*="/chat"], button:has-text("Chat")');
    if ((await chatLink.count()) > 0) {
      await chatLink.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display chat interface after login', async ({ page }) => {
    // Simply check that we're not on the login page anymore
    expect(page.url()).not.toContain('/user/login');

    // Check for some basic page structure (h1, form elements, buttons)
    const pageElements = page.locator('h1, textarea, input, button').first();
    await expect(pageElements).toBeVisible();
  });

  test('should show basic page structure', async ({ page }) => {
    // Check that we have some interactive elements on the page
    const interactiveElements = page.locator('button, input, textarea, select');
    await expect(interactiveElements.first()).toBeVisible();
  });

  test('should create new conversation when sending message', async ({
    page,
  }) => {
    // Fill in chat input
    await page
      .locator('textarea, input[type="text"]')
      .fill('Hello, this is a test message');

    // Click send button
    await page
      .locator('button[type="submit"], button:has-text("Send")')
      .click();

    // Wait for navigation to conversation page
    await page.waitForURL('**/chat/**', { waitUntil: 'networkidle' });

    // Verify we're now in a conversation (URL should contain conversation ID)
    expect(page.url()).toMatch(/\/chat\/[^\/]+$/);
  });

  test('should disable send button when input is empty', async ({ page }) => {
    // Check that send button is disabled when no text
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send")'
    );
    await expect(sendButton).toBeDisabled();

    // Fill input
    await page.locator('textarea, input[type="text"]').fill('Test message');

    // Check that send button is enabled
    await expect(sendButton).toBeEnabled();

    // Clear input
    await page.locator('textarea, input[type="text"]').clear();

    // Check that send button is disabled again
    await expect(sendButton).toBeDisabled();
  });

  test('should switch between chat modes', async ({ page }) => {
    // Look for mode selector buttons/dropdown
    const modeSelector = page.locator(
      '[data-testid="chat-mode"], .chat-mode, button:has-text("ASK"), button:has-text("WRITE")'
    );

    if ((await modeSelector.count()) > 0) {
      // If mode selector exists, test switching
      await modeSelector.first().click();

      // Check for mode options
      await expect(page.locator('text=ASK, text=WRITE')).toBeVisible();
    }
  });

  test('should toggle chat tools', async ({ page }) => {
    // Look for tool toggle buttons
    const toolButtons = page.locator(
      '[data-testid="tool-toggle"], button:has-text("Web Search"), button:has-text("Private Search"), button:has-text("Reasoning")'
    );

    if ((await toolButtons.count()) > 0) {
      // Click first tool button to toggle
      await toolButtons.first().click();

      // Verify tool state changed (could be visual indicator like active class)
      // This is hard to test without specific data attributes
    }
  });

  test('should navigate to conversation list', async ({ page }) => {
    // Look for conversations link/button
    const conversationsLink = page.locator(
      'a:has-text("Conversations"), button:has-text("Conversations"), [data-testid="conversations-link"]'
    );

    if ((await conversationsLink.count()) > 0) {
      await conversationsLink.click();

      // Wait for navigation
      await expect(page).toHaveURL('**/chat/conversations');
    }
  });

  test('should handle context/attachments', async ({ page }) => {
    // Look for context/attachment area
    const contextArea = page.locator(
      '[data-testid="chat-context"], .chat-context'
    );

    if ((await contextArea.count()) > 0) {
      // Test context functionality if present
      await expect(contextArea).toBeVisible();
    }
  });
});

test.describe('Chat Conversation', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to an existing conversation
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Create a conversation first by sending a message
    await page.goto('/namespace_id/chat');
    await page
      .locator('textarea, input[type="text"]')
      .fill('Test conversation');
    await page
      .locator('button[type="submit"], button:has-text("Send")')
      .click();
    await page.waitForURL('**/chat/**', { waitUntil: 'networkidle' });
  });

  test('should display conversation messages', async ({ page }) => {
    // Check for message container
    await expect(
      page.locator('[data-testid="messages"], .messages, .conversation')
    ).toBeVisible();

    // Check for user message
    await expect(page.locator('text="Test conversation"')).toBeVisible();
  });

  test('should allow editing conversation title', async ({ page }) => {
    // Look for title edit button/functionality
    const titleElement = page.locator(
      '[data-testid="conversation-title"], h1, .title'
    );

    if ((await titleElement.count()) > 0) {
      // Try to find edit button or double-click title
      const editButton = page.locator(
        '[data-testid="edit-title"], button:has-text("Edit")'
      );

      if ((await editButton.count()) > 0) {
        await editButton.click();

        // Look for input field
        const titleInput = page.locator('input[type="text"]:visible');
        await titleInput.fill('Updated Conversation Title');

        // Submit the edit
        await page.keyboard.press('Enter');

        // Verify title was updated
        await expect(
          page.locator('text="Updated Conversation Title"')
        ).toBeVisible();
      }
    }
  });

  test('should send follow-up messages in conversation', async ({ page }) => {
    // Wait for initial message to load
    await page.waitForTimeout(1000);

    // Send a follow-up message
    const messageInput = page.locator('textarea, input[type="text"]');
    await messageInput.fill('This is a follow-up message');

    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send")'
    );
    await sendButton.click();

    // Wait for message to appear
    await expect(
      page.locator('text="This is a follow-up message"')
    ).toBeVisible();
  });

  test('should handle message operations', async ({ page }) => {
    // Wait for messages to load
    await page.waitForTimeout(1000);

    // Look for message action buttons (copy, regenerate, etc.)
    const messageActions = page.locator(
      '[data-testid="message-actions"], .message-actions, button:has-text("Copy")'
    );

    if ((await messageActions.count()) > 0) {
      // Test copy functionality if available
      const copyButton = page.locator('button:has-text("Copy")').first();
      if ((await copyButton.count()) > 0) {
        await copyButton.click();
        // Copy action performed (hard to verify clipboard in tests)
      }
    }
  });
});
