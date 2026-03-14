import { test, expect } from '@playwright/test';

test.describe('Dispute Flow', () => {
  const buyerCredentials = { email: 'buyer@test.com', password: 'password123' };
  const sellerCredentials = { email: 'seller@test.com', password: 'password123' };

  test.beforeEach(async ({ page }) => {
    // Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerCredentials.email);
    await page.fill('input[type="password"]', buyerCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('DIS-FE-001: Open dispute button should be visible for delivered orders', async ({ page }) => {
    // Navigate to orders
    await page.goto('/orders');
    
    // Find a delivered order
    const deliveredOrder = page.locator('[data-status="DELIVERED"]').first();
    await expect(deliveredOrder).toBeVisible();
    
    // Click to view order details
    await deliveredOrder.click();
    
    // Check dispute button is visible
    const disputeButton = page.getByRole('button', { name: /mở tranh chấp/i });
    await expect(disputeButton).toBeVisible();
  });

  test('DIS-FE-002: Create dispute form should have all required fields', async ({ page }) => {
    // Navigate to create dispute page
    await page.goto('/disputes/create?orderId=1');
    
    // Check order ID field
    await expect(page.getByLabel('Mã đơn hàng')).toBeVisible();
    
    // Check reason dropdown
    await expect(page.getByLabel('Lý do tranh chấp')).toBeVisible();
    
    // Check description textarea
    await expect(page.getByLabel('Mô tả chi tiết')).toBeVisible();
    
    // Check submit button
    await expect(page.getByRole('button', { name: /gửi yêu cầu/i })).toBeVisible();
  });

  test('DIS-FE-003: Create dispute with valid data should succeed', async ({ page }) => {
    // Navigate to create dispute page
    await page.goto('/disputes/create?orderId=1');
    
    // Fill form
    await page.selectOption('select', 'account_not_received');
    await page.fill('textarea', 'This is a test dispute description that is longer than 20 characters');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dispute detail page
    await expect(page).toHaveURL(/\/disputes\/\d+/);
  });

  test('DIS-FE-004: Create dispute with short description should fail validation', async ({ page }) => {
    // Navigate to create dispute page
    await page.goto('/disputes/create?orderId=1');
    
    // Fill form with short description
    await page.selectOption('select', 'account_not_received');
    await page.fill('textarea', 'Short');
    
    // Submit button should be disabled
    const submitButton = page.getByRole('button', { name: /gửi yêu cầu/i });
    await expect(submitButton).toBeDisabled();
  });

  test('DIS-FE-005: Toast notification should appear on successful dispute creation', async ({ page }) => {
    // Navigate to create dispute page
    await page.goto('/disputes/create?orderId=1');
    
    // Fill form
    await page.selectOption('select', 'account_not_received');
    await page.fill('textarea', 'This is a test dispute description that is longer than 20 characters');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.getByText('Tạo tranh chấp thành công')).toBeVisible();
  });
});

test.describe('Dispute Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('DIS-FE-006: Dispute detail should show all information', async ({ page }) => {
    // Navigate to dispute detail
    await page.goto('/disputes/1');
    
    // Check dispute ID
    await expect(page.getByText(/Mã tranh chấp/)).toBeVisible();
    
    // Check order ID
    await expect(page.getByText(/Mã đơn hàng/)).toBeVisible();
    
    // Check reason
    await expect(page.getByText(/Lý do/)).toBeVisible();
    
    // Check status badge
    await expect(page.locator('[class*="rounded-full"]')).toBeVisible();
  });

  test('DIS-FE-007: Timeline should display correctly', async ({ page }) => {
    await page.goto('/disputes/1');
    
    // Check timeline section
    await expect(page.getByText('Tin nhắn')).toBeVisible();
  });

  test('DIS-FE-008: Chat panel should allow sending messages', async ({ page }) => {
    await page.goto('/disputes/1');
    
    // Check message input
    const messageInput = page.getByPlaceholder('Nhập tin nhắn...');
    await expect(messageInput).toBeVisible();
    
    // Check send button
    await expect(page.getByRole('button', { name: /gửi/i })).toBeVisible();
  });

  test('DIS-FE-009: Evidence upload should be available', async ({ page }) => {
    await page.goto('/disputes/1');
    
    // Check file input
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });
});

test.describe('Seller Dispute Response', () => {
  test.beforeEach(async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', 'seller@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('DIS-FE-011: Seller should receive notification for new dispute', async ({ page }) => {
    // Check notifications
    await page.click('[data-testid="notifications-button"]');
    await expect(page.getByText(/tranh chấp mới/i)).toBeVisible();
  });

  test('DIS-FE-012: Seller should be able to respond with evidence', async ({ page }) => {
    await page.goto('/disputes/1');
    
    // Check message input
    const messageInput = page.getByPlaceholder('Nhập tin nhắn...');
    await expect(messageInput).toBeVisible();
    
    // Check file upload
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });
});

test.describe('Buyer Withdraw Dispute', () => {
  test.beforeEach(async ({ page }) => {
    // Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('DIS-FE-014: Buyer should be able to withdraw dispute', async ({ page }) => {
    await page.goto('/disputes/1');
    
    // Check withdraw button
    const withdrawButton = page.getByRole('button', { name: /rút tranh chấp/i });
    await expect(withdrawButton).toBeVisible();
    
    // Click withdraw
    await withdrawButton.click();
    
    // Confirm dialog should appear
    await expect(page.getByText(/bạn có chắc muốn rút/i)).toBeVisible();
  });
});
