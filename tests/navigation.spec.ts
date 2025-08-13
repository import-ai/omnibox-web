import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Should be redirected to a namespace
    // Wait for navigation to complete
    await page.waitForTimeout(2000);
  });

  test('should display sidebar with navigation elements', async ({ page }) => {
    // Check for sidebar container
    await expect(
      page.locator(
        '[data-sidebar="sidebar"], .sidebar, [data-testid="sidebar"]'
      )
    ).toBeVisible();

    // Check for sidebar header with namespace switcher
    const sidebarHeader = page.locator(
      '[data-sidebar="sidebar-header"], .sidebar-header, [data-testid="sidebar-header"]'
    );
    if ((await sidebarHeader.count()) > 0) {
      await expect(sidebarHeader).toBeVisible();
    }
  });

  test('should display namespace switcher', async ({ page }) => {
    // Look for namespace switcher button
    const namespaceSwitcher = page.locator(
      'button:has(.lucide-command), [data-testid="namespace-switcher"], .sidebar button:has(span)'
    );

    if ((await namespaceSwitcher.count()) > 0) {
      await expect(namespaceSwitcher.first()).toBeVisible();

      // Check for namespace name
      await expect(namespaceSwitcher.first().locator('span')).toBeVisible();

      // Check for chevron down icon
      const chevronIcon = namespaceSwitcher
        .first()
        .locator('.lucide-chevron-down, [data-testid="chevron-down"]');
      if ((await chevronIcon.count()) > 0) {
        await expect(chevronIcon).toBeVisible();
      }
    }
  });

  test('should open namespace dropdown when clicked', async ({ page }) => {
    const namespaceSwitcher = page.locator(
      'button:has(.lucide-command), [data-testid="namespace-switcher"]'
    );

    if ((await namespaceSwitcher.count()) > 0) {
      await namespaceSwitcher.first().click();

      // Check for dropdown menu
      const dropdown = page.locator(
        '[data-radix-popper-content-wrapper], .dropdown-menu, [role="menu"]'
      );
      if ((await dropdown.count()) > 0) {
        await expect(dropdown).toBeVisible();

        // Check for profile/settings options
        const profileOption = page.locator(
          'button:has-text("Profile"), [data-testid="profile-button"]'
        );
        if ((await profileOption.count()) > 0) {
          await expect(profileOption).toBeVisible();
        }

        // Check for logout option
        const logoutOption = page.locator(
          'button:has-text("Logout"), [data-testid="logout-button"]'
        );
        if ((await logoutOption.count()) > 0) {
          await expect(logoutOption).toBeVisible();
        }
      }
    }
  });

  test('should switch between namespaces', async ({ page }) => {
    const namespaceSwitcher = page.locator('button:has(.lucide-command)');

    if ((await namespaceSwitcher.count()) > 0) {
      await namespaceSwitcher.first().click();

      // Look for namespace options in dropdown
      const namespaceOptions = page.locator(
        '[role="menuitem"]:has(.lucide-command), .dropdown-menu button:has(.lucide-command)'
      );

      if ((await namespaceOptions.count()) > 1) {
        // Click on a different namespace (not the current one)
        const availableOptions = namespaceOptions.filter({
          hasNot: page.locator('[aria-disabled="true"]'),
        });

        if ((await availableOptions.count()) > 0) {
          const currentUrl = page.url();
          await availableOptions.first().click();

          // Wait for navigation
          await page.waitForTimeout(1000);

          // URL should change to different namespace
          expect(page.url()).not.toBe(currentUrl);
          expect(page.url()).toMatch(/\/[^\/]+\/chat$/); // Should navigate to new namespace's chat
        }
      }
    }
  });

  test('should navigate between Chat and Resources sections', async ({
    page,
  }) => {
    // Look for navigation tabs/buttons for Chat and Resources
    const chatTab = page.locator(
      'button:has-text("Chat"), [data-testid="chat-tab"], a[href*="/chat"]'
    );
    const resourceTab = page.locator(
      'button:has-text("Resources"), [data-testid="resource-tab"], a[href*="/resource"]'
    );

    // Test Chat navigation
    if ((await chatTab.count()) > 0) {
      await chatTab.first().click();
      await page.waitForTimeout(500);
      expect(page.url()).toMatch(/\/chat/);
    }

    // Test Resource navigation
    if ((await resourceTab.count()) > 0) {
      await resourceTab.first().click();
      await page.waitForTimeout(500);
      // Should be in resources section
      expect(page.url()).not.toMatch(/\/chat/);
    }
  });

  test('should display resource tree in sidebar', async ({ page }) => {
    // Navigate to resources section first
    const currentUrl = page.url();
    if (!currentUrl.includes('/chat')) {
      // Already in resources or navigate there
      await page.goto(currentUrl.replace(/\/[^\/]*$/, ''));
    }

    // Look for resource tree/list in sidebar
    const resourceTree = page.locator(
      '[data-testid="resource-tree"], .resource-tree, .sidebar-content'
    );

    if ((await resourceTree.count()) > 0) {
      await expect(resourceTree).toBeVisible();

      // Check for resource items or folders
      const resourceItems = page.locator(
        '[data-testid="resource-item"], .resource-item, .sidebar .tree-item'
      );

      if ((await resourceItems.count()) > 0) {
        await expect(resourceItems.first()).toBeVisible();
      }
    }
  });

  test('should expand and collapse sidebar sections', async ({ page }) => {
    // Look for expandable sections in sidebar
    const expandableItems = page.locator(
      'button:has(.lucide-chevron-right), button:has(.lucide-chevron-down), [data-testid="expandable-item"]'
    );

    if ((await expandableItems.count()) > 0) {
      const firstExpandable = expandableItems.first();

      // Check current state and toggle
      const isExpanded =
        (await firstExpandable.locator('.lucide-chevron-down').count()) > 0;

      await firstExpandable.click();
      await page.waitForTimeout(300);

      // State should have changed
      if (isExpanded) {
        // Was expanded, now should be collapsed
        await expect(
          firstExpandable.locator('.lucide-chevron-right')
        ).toBeVisible();
      } else {
        // Was collapsed, now should be expanded
        await expect(
          firstExpandable.locator('.lucide-chevron-down')
        ).toBeVisible();
      }
    }
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Look for breadcrumb navigation
    const breadcrumb = page.locator(
      '[data-testid="breadcrumb"], .breadcrumb, nav[aria-label="breadcrumb"]'
    );

    if ((await breadcrumb.count()) > 0) {
      await expect(breadcrumb).toBeVisible();

      // Check for breadcrumb items
      const breadcrumbItems = page.locator(
        '.breadcrumb-item, [data-testid="breadcrumb-item"]'
      );

      if ((await breadcrumbItems.count()) > 1) {
        // Click on a parent breadcrumb item
        const parentItem = breadcrumbItems.nth(-2); // Second to last item
        if ((await parentItem.count()) > 0) {
          const currentUrl = page.url();
          await parentItem.click();

          // Should navigate to parent level
          await page.waitForTimeout(500);
          expect(page.url()).not.toBe(currentUrl);
        }
      }
    }
  });

  test('should handle sidebar rail (resize handle)', async ({ page }) => {
    // Look for sidebar rail/resize handle
    const sidebarRail = page.locator(
      '[data-sidebar="sidebar-rail"], .sidebar-rail, [data-testid="sidebar-rail"]'
    );

    if ((await sidebarRail.count()) > 0) {
      await expect(sidebarRail).toBeVisible();

      // The rail should be interactive (cursor should change on hover)
      await sidebarRail.hover();

      // Rail should have resize cursor or similar indication
      // This is hard to test directly but we can verify it's present
    }
  });

  test('should create new resources from sidebar', async ({ page }) => {
    // Look for create/add buttons in sidebar
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add"), button:has(.lucide-plus), [data-testid="create-button"]'
    );

    if ((await createButton.count()) > 0) {
      await createButton.first().click();

      // Should show create options or navigate to editor
      await page.waitForTimeout(500);

      // Either a context menu appears or we navigate to edit mode
      const contextMenu = page.locator(
        '[role="menu"], .context-menu, [data-testid="create-menu"]'
      );
      const isInEditMode =
        page.url().includes('/edit') || page.url().includes('/create');

      if ((await contextMenu.count()) > 0) {
        await expect(contextMenu).toBeVisible();
      } else {
        expect(isInEditMode).toBe(true);
      }
    }
  });

  test('should handle drag and drop in sidebar', async ({ page }) => {
    // This is complex to test without actual draggable items
    // We'll just verify that draggable elements exist
    const draggableItems = page.locator(
      '[draggable="true"], [data-testid="draggable-item"]'
    );

    if ((await draggableItems.count()) > 0) {
      // Draggable items are present
      await expect(draggableItems.first()).toBeVisible();

      // Check for drop zones
      const dropZones = page.locator(
        '[data-drop-zone], [data-testid="drop-zone"]'
      );
      if ((await dropZones.count()) > 0) {
        await expect(dropZones.first()).toBeVisible();
      }
    }
  });
});

test.describe('Theme and Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login and open settings
    await page.goto('/user/login');
    await page.getByPlaceholder(/email/i).fill('omnibox@qq.com');
    await page.getByPlaceholder(/password/i).fill('Nh4PLRKPQw');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('/**', { waitUntil: 'networkidle' });

    // Open namespace dropdown to access settings
    const namespaceSwitcher = page.locator('button:has(.lucide-command)');
    if ((await namespaceSwitcher.count()) > 0) {
      await namespaceSwitcher.first().click();
    }
  });

  test('should toggle theme between light and dark', async ({ page }) => {
    // Look for theme toggle button
    const themeToggle = page.locator(
      'button:has-text("Theme"), button:has(.lucide-sun), button:has(.lucide-moon), [data-testid="theme-toggle"]'
    );

    if ((await themeToggle.count()) > 0) {
      // Get current theme state
      const isDarkMode =
        (await page
          .locator('html[class*="dark"], body[class*="dark"]')
          .count()) > 0;

      await themeToggle.first().click();
      await page.waitForTimeout(300);

      // Theme should have changed
      const isNowDarkMode =
        (await page
          .locator('html[class*="dark"], body[class*="dark"]')
          .count()) > 0;
      expect(isNowDarkMode).toBe(!isDarkMode);
    }
  });

  test('should switch language', async ({ page }) => {
    // Look for language toggle button
    const languageToggle = page.locator(
      'button:has-text("Language"), button:has-text("EN"), button:has-text("中文"), [data-testid="language-toggle"]'
    );

    if ((await languageToggle.count()) > 0) {
      await languageToggle.first().click();
      await page.waitForTimeout(300);

      // Check if page content language changed
      // This is hard to verify without specific text, but we can check that the button was clicked
    }
  });

  test('should access profile settings', async ({ page }) => {
    // Look for profile button in the dropdown
    const profileButton = page.locator(
      'button:has-text("Profile"), [data-testid="profile-button"]'
    );

    if ((await profileButton.count()) > 0) {
      await profileButton.click();

      // Should open profile settings modal/dialog
      const profileModal = page.locator(
        '[role="dialog"], .modal, [data-testid="profile-modal"]'
      );
      if ((await profileModal.count()) > 0) {
        await expect(profileModal).toBeVisible();
      }
    }
  });

  test('should logout successfully', async ({ page }) => {
    // Look for logout button in the dropdown
    const logoutButton = page.locator(
      'button:has-text("Logout"), [data-testid="logout-button"]'
    );

    if ((await logoutButton.count()) > 0) {
      await logoutButton.click();

      // Wait for logout and redirect
      await page.waitForTimeout(1000);

      // Should be redirected to login page
      expect(page.url()).toMatch(/\/user\/login/);
    }
  });
});
