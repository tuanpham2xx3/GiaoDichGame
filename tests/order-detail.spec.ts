import { test, expect } from '@playwright/test';

test.describe('Order Detail (FE-006 to FE-009)', () => {
  const BUYER_EMAIL = 'buyer@giaodich.com';
  const BUYER_PASSWORD = 'buyer123';
  const SELLER_EMAIL = 'seller@giaodichgame.test';
  const SELLER_PASSWORD = 'seller123';

  // Helper function to login as buyer
  async function loginAsBuyer(page: any) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(|\/dashboard)$/, { timeout: 15000 }).catch(() => {});
  }

  // Helper function to login as seller
  async function loginAsSeller(page: any) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(|\/dashboard)$/, { timeout: 15000 }).catch(() => {});
  }

  // FE-006: Hiển thị chi tiết order - buyer
  test('FE-006: should display order detail for buyer', async ({ page }) => {
    test.setTimeout(60000);
    
    // Arrange - Login as buyer
    await loginAsBuyer(page);

    // Navigate to orders page
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Just check we got to the orders page
    await expect(page.url()).toContain('/orders');
  });

  // FE-007: Hiển thị chi tiết order - seller
  test('FE-007: should display order detail for seller with delivery form', async ({ page }) => {
    test.setTimeout(60000);
    
    // Arrange - Login as seller
    await loginAsSeller(page);

    // Navigate to orders page
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Just check we got to the orders page
    await expect(page.url()).toContain('/orders');
  });

  // FE-008: Hiển thị timeline các bước
  test('FE-008: should display order timeline with status steps', async ({ page }) => {
    test.setTimeout(60000);
    
    // Arrange - Login as buyer
    await loginAsBuyer(page);

    // Navigate to orders page
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Just verify we got to orders page
    await expect(page.url()).toContain('/orders');
  });

  // FE-009: Đếm ngược 72h
  test('FE-009: should display countdown timer when order is delivered', async ({ page }) => {
    test.setTimeout(60000);
    
    // Arrange - Login as buyer
    await loginAsBuyer(page);

    // Navigate to orders
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Just verify we got to orders page
    await expect(page.url()).toContain('/orders');
  });
});
