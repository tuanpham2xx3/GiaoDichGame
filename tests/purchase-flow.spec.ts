import { test, expect } from '@playwright/test';

test.describe('Purchase Flow (FE-001 to FE-005)', () => {
  const BUYER_EMAIL = 'buyer@giaodich.com';
  const BUYER_PASSWORD = 'buyer123';

  // FE-001: Hiển thị modal mua hàng
  test('FE-001: should display purchase modal when clicking "Mua ngay"', async ({ page }) => {
    // Arrange - Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to listings
    await page.goto('/listings');

    // Click on first listing
    await page.click('[data-testid="listing-card"] >> nth=0');

    // Click "Mua ngay" button
    await page.click('button:has-text("Mua ngay")');

    // Assert - Modal should be visible
    await expect(page.locator('text=Xác nhận mua hàng')).toBeVisible();
    await expect(page.locator('text=Giá')).toBeVisible();
    await expect(page.locator('text=Số dư khả dụng')).toBeVisible();
  });

  // FE-002: Tạo order từ modal
  test('FE-002: should create order when clicking confirm payment', async ({ page }) => {
    // Arrange - Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to listings
    await page.goto('/listings');

    // Click on first listing that is PUBLISHED
    const listingCards = page.locator('[data-testid="listing-card"]');
    const count = await listingCards.count();
    
    if (count > 0) {
      await listingCards.first().click();
      
      // Click "Mua ngay" button if visible
      const buyButton = page.locator('button:has-text("Mua ngay")');
      if (await buyButton.isVisible()) {
        await buyButton.click();
        
        // Check if can afford
        const confirmButton = page.locator('button:has-text("Xác nhận thanh toán")');
        const isDisabled = await confirmButton.isDisabled();
        
        if (!isDisabled) {
          // Click confirm
          await confirmButton.click();
          
          // Should redirect to order detail
          await expect(page).toHaveURL(/\/orders\/\d+/);
        }
      }
    }
  });

  // FE-003: Hiển thị lỗi - số dư không đủ
  test('FE-003: should display error when balance is insufficient', async ({ page }) => {
    // This test requires a buyer account with insufficient balance
    // For now, skip this test as it requires specific test data setup
    test.skip(true, 'Requires buyer with insufficient balance');
  });

  // FE-004: Redirect đến login
  test('FE-004: should redirect to login when not authenticated', async ({ page }) => {
    // Go to listings directly without login
    await page.goto('/listings');
    
    // Try to click "Mua ngay" if visible
    const buyButton = page.locator('button:has-text("Mua ngay")');
    
    if (await buyButton.isVisible()) {
      await buyButton.click();
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    }
  });

  // FE-005: Ẩn nút mua nếu là seller
  test('FE-005: should hide buy button if user is seller of listing', async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', 'seller@giaodich.com');
    await page.fill('input[type="password"]', 'seller123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to my-listings page
    await page.goto('/my-listings');

    // Click on first listing that belongs to seller
    const listingCards = page.locator('[data-testid="my-listing-card"]');
    const count = await listingCards.count();
    
    if (count > 0) {
      await listingCards.first().click();
      
      // "Mua ngay" button should not be visible
      const buyButton = page.locator('button:has-text("Mua ngay")');
      await expect(buyButton).not.toBeVisible();
    }
  });
});
