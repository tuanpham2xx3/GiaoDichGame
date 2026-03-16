import { test, expect } from '@playwright/test';

test.describe('Admin Flow E2E Tests (E2E-ADMIN-001 to E2E-ADMIN-003)', () => {
  const ADMIN_EMAIL = 'admin@giaodich.com';
  const ADMIN_PASSWORD = 'admin123';

  // E2E-ADMIN-001: Admin login → View stats → Manage users
  test('E2E-ADMIN-001: should access admin dashboard and view stats', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to admin dashboard
    await page.goto('/admin');
    
    // 3. Verify admin stats are displayed
    const statsCards = page.locator('[data-testid="admin-stats-card"]');
    await expect(statsCards.first()).toBeVisible();
    
    // 4. Check for key stats
    await expect(page.locator('text=Tổng người dùng')).toBeVisible();
    await expect(page.locator('text=Tổng đơn hàng')).toBeVisible();
    await expect(page.locator('text=Tổng tranh chấp')).toBeVisible();
    await expect(page.locator('text=Tổng doanh thu')).toBeVisible();
  });

  // E2E-ADMIN-002: Admin ban/unban user
  test('E2E-ADMIN-002: should ban and unban user', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 2. Navigate to user management
    await page.goto('/admin/users');
    
    // 3. Find a user to manage
    const userRows = page.locator('[data-testid="user-row"]');
    const count = await userRows.count();
    
    test.skip(count === 0, 'No users available');
    
    // 4. Click on user actions
    const actionButton = userRows.first().locator('button:has-text("Hành động")');
    await actionButton.click();
    
    // 5. Ban user
    const banButton = page.locator('button:has-text("Khóa tài khoản")');
    await banButton.click();
    
    // 6. Confirm ban action
    const confirmButton = page.locator('button:has-text("Xác nhận khóa")');
    await confirmButton.click();
    
    // 7. Verify user is banned
    await expect(page.locator('text=Đã khóa tài khoản')).toBeVisible();
    
    // 8. Unban user
    await actionButton.click();
    const unbanButton = page.locator('button:has-text("Mở khóa tài khoản")');
    await unbanButton.click();
    
    // 9. Confirm unban action
    const confirmUnbanButton = page.locator('button:has-text("Xác nhận mở khóa")');
    await confirmUnbanButton.click();
    
    // 10. Verify user is unbanned
    await expect(page.locator('text=Đã mở khóa tài khoản')).toBeVisible();
  });

  // E2E-ADMIN-003: Admin confirm topup request
  test('E2E-ADMIN-003: should confirm topup request', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 2. Navigate to topup management
    await page.goto('/admin/topups');
    
    // 3. Find pending topup requests
    const topupRows = page.locator('[data-testid="topup-row"]');
    const count = await topupRows.count();
    
    test.skip(count === 0, 'No pending topup requests');
    
    // 4. Click confirm on first pending topup
    const confirmButton = topupRows.first().locator('button:has-text("Xác nhận")');
    await confirmButton.click();
    
    // 5. Confirm the action in modal
    const modalConfirmButton = page.locator('button:has-text("Xác nhận giao dịch")');
    await modalConfirmButton.click();
    
    // 6. Verify success message
    await expect(page.locator('text=Xác nhận thành công')).toBeVisible();
    
    // 7. Verify topup status changed to SUCCESS
    await expect(topupRows.first().locator('text=SUCCESS')).toBeVisible();
  });
});
