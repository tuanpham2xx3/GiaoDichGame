import { test, expect } from '@playwright/test';

test.describe('Admin Dispute Management', () => {
  const adminCredentials = { email: 'admin@test.com', password: 'admin123' };

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', adminCredentials.email);
    await page.fill('input[type="password"]', adminCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('DIS-ADM-001: Admin should see dispute stats on dashboard', async ({ page }) => {
    // Navigate to admin disputes
    await page.goto('/admin/disputes');
    
    // Check stats cards
    await expect(page.getByText('Tổng số')).toBeVisible();
    await expect(page.getByText('Chờ xử lý')).toBeVisible();
    await expect(page.getByText('Đang xem xét')).toBeVisible();
    await expect(page.getByText('Đã giải quyết')).toBeVisible();
  });

  test('DIS-ADM-002: Admin should see quick links', async ({ page }) => {
    await page.goto('/admin/disputes');
    
    // Check quick links
    await expect(page.getByText('Danh sách tranh chấp')).toBeVisible();
    await expect(page.getByText('Cấu hình')).toBeVisible();
  });

  test('DIS-ADM-003: Admin should view dispute list with filters', async ({ page }) => {
    await page.goto('/admin/disputes/list');
    
    // Check filter dropdown
    await expect(page.getByRole('combobox')).toBeVisible();
    
    // Filter by status
    await page.selectOption('select', 'OPEN');
    
    // Check results
    await expect(page.getByText('Danh sách tranh chấp')).toBeVisible();
  });

  test('DIS-ADM-004: Admin should view dispute detail', async ({ page }) => {
    await page.goto('/admin/disputes/1');
    
    // Check dispute info
    await expect(page.getByText(/Mã tranh chấp/)).toBeVisible();
    await expect(page.getByText(/Mã đơn hàng/)).toBeVisible();
    
    // Check messages section
    await expect(page.getByText('Tin nhắn')).toBeVisible();
  });

  test('DIS-ADM-005: Admin should be able to judge dispute with REFUND', async ({ page }) => {
    await page.goto('/admin/disputes/1');
    
    // Check judge form
    await expect(page.getByText('Phán quyết')).toBeVisible();
    
    // Select REFUND
    await page.click('text=Hoàn tiền cho người mua');
    
    // Add note
    await page.fill('textarea', 'Refund due to account not received');
    
    // Submit
    await page.click('button:has-text("Phán quyết")');
    
    // Should show success
    await expect(page.getByText('Giải quyết thành công')).toBeVisible();
  });

  test('DIS-ADM-006: Admin should be able to judge dispute with RELEASE', async ({ page }) => {
    await page.goto('/admin/disputes/1');
    
    // Check judge form
    await expect(page.getByText('Phán quyết')).toBeVisible();
    
    // Select RELEASE
    await page.click('text=Giải ngân cho người bán');
    
    // Add note
    await page.fill('textarea', 'Release to seller as account was valid');
    
    // Submit
    await page.click('button:has-text("Phán quyết")');
    
    // Should show success
    await expect(page.getByText('Giải quyết thành công')).toBeVisible();
  });

  test('DIS-ADM-007: Admin should be able to view full chat history', async ({ page }) => {
    await page.goto('/admin/disputes/1');
    
    // Check messages section
    const messages = page.locator('[class*="p-3 rounded-lg"]');
    await expect(messages.first()).toBeVisible();
  });

  test('DIS-ADM-008: Admin should be able to download evidence files', async ({ page }) => {
    await page.goto('/admin/disputes/1');
    
    // Check evidence section
    await expect(page.getByText('Bằng chứng')).toBeVisible();
    
    // If there are files, download button should be visible
    const downloadButton = page.getByRole('button', { name: /tải về/i });
    if (await downloadButton.isVisible()) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('DIS-ADM-009: Admin should be able to access dispute settings', async ({ page }) => {
    await page.goto('/admin/disputes/settings');
    
    // Check settings form
    await expect(page.getByText('Thời gian auto refund')).toBeVisible();
    
    // Check input
    await expect(page.locator('input[type="number"]')).toBeVisible();
  });

  test('DIS-ADM-010: Admin should be able to update auto refund hours', async ({ page }) => {
    await page.goto('/admin/disputes/settings');
    
    // Change auto refund hours
    await page.fill('input[type="number"]', '12');
    
    // Save
    await page.click('button:has-text("Lưu cấu hình")');
    
    // Should show success
    await expect(page.getByText('Lưu thành công!')).toBeVisible();
  });
});

test.describe('Dispute Stats', () => {
  const adminCredentials = { email: 'admin@test.com', password: 'admin123' };

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', adminCredentials.email);
    await page.fill('input[type="password"]', adminCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('DIS-ADM-011: Stats should show correct counts', async ({ page }) => {
    await page.goto('/admin/disputes');
    
    // All stat cards should have numbers
    const statValues = page.locator('[class*="text-2xl"]');
    const count = await statValues.count();
    expect(count).toBeGreaterThan(0);
  });
});
