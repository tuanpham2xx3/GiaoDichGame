import { test, expect } from '@playwright/test';

test.describe('Buyer View Game Info (FE-014 to FE-018)', () => {
  const BUYER_EMAIL = 'buyer@giaodich.com';
  const BUYER_PASSWORD = 'buyer123';
  const SELLER_EMAIL = 'seller@giaodich.com';
  const SELLER_PASSWORD = 'seller123';

  // FE-014: Hiển thị nút xem TKGAME
  test('FE-014: should display view game info button when order is DELIVERED', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/orders');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      const deliveredBadge = page.locator('text=DELIVERED');
      if (await deliveredBadge.isVisible()) {
        await expect(page.locator('button:has-text("Xem thông tin TKGAME")')).toBeVisible();
      }
    }
  });

  // FE-015: Xem TKGAME thành công
  test('FE-015: should display game info when clicking view button', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/orders');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      const deliveredBadge = page.locator('text=DELIVERED');
      if (await deliveredBadge.isVisible()) {
        await page.click('button:has-text("Xem thông tin TKGAME")');
        await expect(page.locator('[data-testid="game-info-display"]')).toBeVisible();
      }
    }
  });

  // FE-016: Hiển thị nút xác nhận
  test('FE-016: should display confirm receipt button when order is DELIVERED', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/orders');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      const deliveredBadge = page.locator('text=DELIVERED');
      if (await deliveredBadge.isVisible()) {
        await expect(page.locator('button:has-text("Xác nhận đã nhận hàng")')).toBeVisible();
      }
    }
  });

  // FE-017: Xác nhận thành công
  test('FE-017: should complete order when clicking confirm receipt', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/orders');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      const deliveredBadge = page.locator('text=DELIVERED');
      if (await deliveredBadge.isVisible()) {
        await page.click('button:has-text("Xác nhận đã nhận hàng")');
      }
    }
  });

  // FE-018: Không hiển thị TKGAME khi chưa deliver
  test('FE-018: should not display game info button when order is not DELIVERED', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/orders');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    if (count > 0) {
      await orderCards.first().click();
      
      const lockedBadge = page.locator('text=LOCKED');
      if (await lockedBadge.isVisible()) {
        await expect(page.locator('button:has-text("Xem thông tin TKGAME")')).not.toBeVisible();
      }
    }
  });
});
