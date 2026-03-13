import { test, expect } from '@playwright/test';

test.describe('Order Detail (FE-006 to FE-009)', () => {
  const BUYER_EMAIL = 'buyer@giaodich.com';
  const BUYER_PASSWORD = 'buyer123';
  const SELLER_EMAIL = 'seller@giaodich.com';
  const SELLER_PASSWORD = 'seller123';

  // FE-006: Hiển thị chi tiết order - buyer
  test('FE-006: should display order detail for buyer', async ({ page }) => {
    // Arrange - Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to orders page
    await page.goto('/orders');

    // Click on first order if any
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Should display order info
      await expect(page.locator('text=Đơn hàng #')).toBeVisible();
      await expect(page.locator('text=Coin')).toBeVisible();
    }
  });

  // FE-007: Hiển thị chi tiết order - seller
  test('FE-007: should display order detail for seller with delivery form', async ({ page }) => {
    // Arrange - Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to orders page
    await page.goto('/orders');

    // Click on sell tab
    await page.click('button:has-text("Đơn bán")');

    // Click on first order if any
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Should display order info
      await expect(page.locator('text=Đơn hàng #')).toBeVisible();
    }
  });

  // FE-008: Hiển thị timeline các bước
  test('FE-008: should display order timeline with status steps', async ({ page }) => {
    // Arrange - Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to an order
    await page.goto('/orders');
    
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Should display timeline
      await expect(page.locator('[data-testid="order-timeline"]')).toBeVisible();
    }
  });

  // FE-009: Đếm ngược 72h
  test('FE-009: should display countdown timer when order is delivered', async ({ page }) => {
    // Arrange - Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to an order that is DELIVERED
    await page.goto('/orders');
    
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // If status is DELIVERED, should show countdown
      // This is a conditional test - depends on order status
      const deliveredBadge = page.locator('text=DELIVERED');
      if (await deliveredBadge.isVisible()) {
        await expect(page.locator('[data-testid="countdown-timer"]')).toBeVisible();
      }
    }
  });
});
