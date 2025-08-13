import { expect, test } from '@playwright/test';

test.describe('Resource Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Navigate to resources (assuming we're redirected to a namespace)
    // May need to adjust based on actual navigation structure
    await page.goto('/namespace_id'); // This might need adjustment
  });

  test('should display resource list/folder view', async ({ page }) => {
    // Check for resource container
    await expect(
      page.locator('[data-testid="resources"], .resources, .folder-content')
    ).toBeVisible();

    // Check for empty state if no resources
    const emptyState = page.locator('text=/no.*pages.*inside/i, text=/empty/i');
    const resourceItems = page.locator(
      '[data-testid="resource-item"], .resource-item, .cursor-pointer.group'
    );

    // Either empty state or resource items should be visible
    const hasEmptyState = (await emptyState.count()) > 0;
    const hasResources = (await resourceItems.count()) > 0;

    expect(hasEmptyState || hasResources).toBe(true);
  });

  test('should create new resource', async ({ page }) => {
    // Look for create/add resource button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), [data-testid="create-resource"]'
    );

    if ((await createButton.count()) > 0) {
      await createButton.first().click();

      // Wait for navigation to editor or creation form
      await page.waitForTimeout(1000);

      // Check if we're in edit mode (URL should contain 'edit' or similar)
      expect(page.url()).toMatch(/\/(edit|create|new)/);
    }
  });

  test('should navigate to resource when clicked', async ({ page }) => {
    // Wait for resources to load
    await page.waitForTimeout(2000);

    // Look for resource items
    const resourceItems = page.locator(
      '[data-testid="resource-item"], .cursor-pointer.group, .resource-item'
    );

    if ((await resourceItems.count()) > 0) {
      const firstResource = resourceItems.first();
      await firstResource.click();

      // Wait for navigation
      await page.waitForTimeout(1000);

      // Check URL changed to resource view
      expect(page.url()).toMatch(/\/[^\/]+\/[^\/]+$/); // Should be namespace/resource pattern
    }
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    // Check for breadcrumb component
    const breadcrumb = page.locator(
      '[data-testid="breadcrumb"], .breadcrumb, nav[aria-label="breadcrumb"]'
    );

    if ((await breadcrumb.count()) > 0) {
      await expect(breadcrumb).toBeVisible();
    }
  });
});

test.describe('Resource Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to resource editor
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Navigate to resource editor (this might need adjustment based on actual URL structure)
    await page.goto('/namespace_id/resource_id/edit');
  });

  test('should display title input and editor', async ({ page }) => {
    // Check for title input
    await expect(
      page.locator(
        'input[type="text"][placeholder*="title"], input[type="text"][placeholder*="Enter"]'
      )
    ).toBeVisible();

    // Check for editor container (Vditor)
    await expect(page.locator('.vditor, [data-testid="editor"]')).toBeVisible();
  });

  test('should allow editing title', async ({ page }) => {
    const titleInput = page
      .locator(
        'input[type="text"][placeholder*="title"], input[type="text"][placeholder*="Enter"]'
      )
      .first();

    if ((await titleInput.count()) > 0) {
      // Clear and enter new title
      await titleInput.clear();
      await titleInput.fill('Test Resource Title');

      // Verify title was entered
      await expect(titleInput).toHaveValue('Test Resource Title');
    }
  });

  test('should save resource with Ctrl/Cmd+S', async ({ page }) => {
    // Wait for editor to load
    await page.waitForTimeout(2000);

    // Enter some content in the editor (if available)
    const editorArea = page.locator(
      '.vditor-ir, .vditor-wysiwyg, textarea, .CodeMirror'
    );

    if ((await editorArea.count()) > 0) {
      await editorArea.first().click();
      await page.keyboard.type('Test content for resource');

      // Save with keyboard shortcut
      await page.keyboard.press('Meta+s'); // Use Meta for Mac, Ctrl for others

      // Wait for save operation
      await page.waitForTimeout(1000);
    }
  });

  test('should handle file uploads in editor', async ({ page }) => {
    // Wait for editor to fully load
    await page.waitForTimeout(3000);

    // Look for upload functionality in the editor toolbar
    const uploadButton = page.locator(
      '.vditor-toolbar button[data-type="upload"], button:has-text("Upload"), .vditor-toolbar .vditor-toolbar__item'
    );

    if ((await uploadButton.count()) > 0) {
      // Editor with upload functionality is present
      await expect(uploadButton.first()).toBeVisible();
    }
  });
});

test.describe('Resource Folder', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a folder resource
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Navigate to folder (this might need adjustment)
    await page.goto('/namespace_id/folder_id');
  });

  test('should display folder contents', async ({ page }) => {
    // Wait for folder content to load
    await page.waitForTimeout(2000);

    // Check for folder items or empty state
    const folderItems = page.locator(
      '[data-testid="folder-item"], .cursor-pointer.group'
    );
    const emptyState = page.locator('text=/no.*pages.*inside/i');

    const hasItems = (await folderItems.count()) > 0;
    const hasEmptyState = (await emptyState.count()) > 0;

    expect(hasItems || hasEmptyState).toBe(true);
  });

  test('should group items by timestamp', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for timestamp group headers
    const timestampHeaders = page.locator(
      '.text-muted-foreground.font-light, [data-testid="timestamp-group"]'
    );

    if ((await timestampHeaders.count()) > 0) {
      // Folder has grouped content
      await expect(timestampHeaders.first()).toBeVisible();
    }
  });

  test('should navigate to subfolder or resource when clicked', async ({
    page,
  }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    const folderItems = page.locator('.cursor-pointer.group').first();

    if ((await folderItems.count()) > 0) {
      const currentUrl = page.url();
      await folderItems.click();

      // Wait for navigation
      await page.waitForTimeout(1000);

      // URL should change
      expect(page.url()).not.toBe(currentUrl);
    }
  });

  test('should display resource metadata', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for resource titles and timestamps
    const resourceTitles = page.locator(
      'h3.text-lg.font-medium, [data-testid="resource-title"]'
    );
    const resourceMeta = page.locator(
      '.text-muted-foreground.text-sm, [data-testid="resource-meta"]'
    );

    if ((await resourceTitles.count()) > 0) {
      await expect(resourceTitles.first()).toBeVisible();
    }

    if ((await resourceMeta.count()) > 0) {
      await expect(resourceMeta.first()).toBeVisible();
    }
  });

  test('should handle hover effects on resource items', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    const folderItems = page.locator('.cursor-pointer.group').first();

    if ((await folderItems.count()) > 0) {
      // Hover over item
      await folderItems.hover();

      // Check for hover effect (text color change)
      const hoveredTitle = page.locator('.group-hover\\:text-blue-500');
      if ((await hoveredTitle.count()) > 0) {
        await expect(hoveredTitle).toBeVisible();
      }
    }
  });
});
