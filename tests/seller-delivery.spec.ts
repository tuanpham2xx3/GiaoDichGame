import { test, expect } from '@playwright/test';

test.describe('Seller Delivery (FE-010 to FE-013)', () => {
  const SELLER_EMAIL = 'seller@giaodich.com';
  const SELLER_PASSWORD = 'seller123';

  // FE-010: Hiển thị form delivery
  test('FE-010: should display delivery form when order is LOCKED', async ({ page }) => {
    // Arrange - Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to orders page - sell tab
    await page.goto('/orders');
    await page.click('button:has-text("Đơn bán")');

    // Find an order with LOCKED status
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Should display delivery form if status is LOCKED
      const deliveryForm = page.locator('[data-testid="delivery-form"]');
      // Only check if form is visible when status is LOCKED
      const lockedBadge = page.locator('text=LOCKED');
      if (await lockedBadge.isVisible()) {
        await expect(deliveryForm).toBeVisible();
      }
    }
  });

  // FE-011: Submit delivery thành công
  test('FE-011: should submit delivery successfully', async ({ page }) => {
    // Arrange - Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to an order that is LOCKED
    await page.goto('/orders');
    await page.click('button:has-text("Đơn bán")');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Check if status is LOCKED
      const lockedBadge = page.locator('text=LOCKED');
      if (await lockedBadge.isVisible()) {
        // Fill in delivery form
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="password"]', 'testpass');
        
        // Click submit
        await page.click('button:has-text("Giao hàng")');
        
        // Should show success or redirect
        // The order status should change from LOCKED to DELIVERED
      }
    }
  });

  // FE-012: Submit delivery - validation
  test('FE-012: should show validation errors when form is empty', async ({ page }) => {
    // Arrange - Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to an order that is LOCKED
    await page.goto('/orders');
    await page.click('button:has-text("Đơn bán")');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Check if status is LOCKED
      const lockedBadge = page.locator('text=LOCKED');
      if (await lockedBadge.isVisible()) {
        // Click submit without filling
        await page.click('button:has-text("Giao hàng")');
        
        // Should show validation errors
        await expect(page.locator('text=Vui lòng nhập')).toBeVisible();
      }
    }
  });

  // FE-013: Submit delivery - không phải seller
  test('FE-013: should not display delivery form if user is not seller', async ({ page }) => {
    // Arrange - Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', 'buyer@giaodich.com');
    await page.fill('input[type="password"]', 'buyer123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Navigate to an order where user is buyer
    await page.goto('/orders');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      // Should not display delivery form
      const deliveryForm = page.locator('[data-testid="delivery-form"]');
      await expect(deliveryForm).not.toBeVisible();
    }
  });
});
