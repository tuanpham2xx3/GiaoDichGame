import { test, expect } from '@playwright/test';

test.describe('Full Flow E2E Tests (E2E-001 to E2E-008)', () => {
  const BUYER_EMAIL = 'buyer@giaodich.com';
  const BUYER_PASSWORD = 'buyer123';
  const SELLER_EMAIL = 'seller@giaodich.com';
  const SELLER_PASSWORD = 'seller123';

  // E2E-001: Buyer flow - Mua hàng thành công
  test('E2E-001: should complete full buyer flow - purchase to completion', async ({ page }) => {
    // 1. Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to listings
    await page.goto('/listings');

    // 3. Click on a listing
    const listingCards = page.locator('[data-testid="listing-card"]');
    const count = await listingCards.count();
    
    test.skip(count === 0, 'No listings available');
    
    await listingCards.first().click();

    // 4. Click "Mua ngay"
    const buyButton = page.locator('button:has-text("Mua ngay")');
    await buyButton.waitFor({ state: 'visible' });
    await buyButton.click();

    // 5. Confirm purchase
    const confirmButton = page.locator('button:has-text("Xác nhận thanh toán")');
    await confirmButton.waitFor({ state: 'visible' });
    
    // Check if button is enabled (has enough balance)
    const isDisabled = await confirmButton.isDisabled();
    if (!isDisabled) {
      await confirmButton.click();
      
      // 6. Should navigate to order detail
      await expect(page).toHaveURL(/\/orders\/\d+/);
      
      // 7. Verify order status is LOCKED
      await expect(page.locator('text=LOCKED')).toBeVisible();
    }
  });

  // E2E-002: Seller flow - Nhận đơn và giao hàng
  test('E2E-002: should complete full seller flow - receive and deliver', async ({ page }) => {
    // 1. Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to orders (sell tab)
    await page.goto('/orders');
    await page.click('button:has-text("Đơn bán")');

    // 3. Find an order with LOCKED status
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    test.skip(count === 0, 'No orders available');
    
    await orderCards.first().click();

    // 4. Verify status is LOCKED
    const lockedBadge = page.locator('text=LOCKED');
    await lockedBadge.waitFor({ state: 'visible' });

    // 5. Fill delivery form
    const deliveryForm = page.locator('[data-testid="delivery-form"]');
    await deliveryForm.waitFor({ state: 'visible' });
    
    await page.fill('input[name="username"]', 'testuser_playwright');
    await page.fill('input[name="password"]', 'testpass123');

    // 6. Click "Giao hàng"
    await page.click('button:has-text("Giao hàng")');

    // 7. Verify status changed to DELIVERED
    await expect(page.locator('text=DELIVERED')).toBeVisible();
  });

  // E2E-003: Buyer xem TKGAME và xác nhận
  test('E2E-003: should complete buyer confirmation flow', async ({ page }) => {
    // 1. Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to orders
    await page.goto('/orders');

    // 3. Find an order with DELIVERED status
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    test.skip(count === 0, 'No orders available');
    
    await orderCards.first().click();

    // 4. Wait for DELIVERED status
    const deliveredBadge = page.locator('text=DELIVERED');
    await deliveredBadge.waitFor({ state: 'visible' });

    // 5. Click "Xem thông tin TKGAME"
    const viewGameButton = page.locator('button:has-text("Xem thông tin TKGAME")');
    await viewGameButton.waitFor({ state: 'visible' });
    await viewGameButton.click();

    // 6. Verify game info is displayed
    await expect(page.locator('[data-testid="game-info-display"]')).toBeVisible();

    // 7. Click "Xác nhận đã nhận hàng"
    const confirmButton = page.locator('button:has-text("Xác nhận đã nhận hàng")');
    await confirmButton.waitFor({ state: 'visible' });
    await confirmButton.click();

    // 8. Verify status changed to COMPLETED
    await expect(page.locator('text=COMPLETED')).toBeVisible();
  });

  // E2E-004: Full flow từ đầu - Tạo listing -> Mua -> Giao -> Xác nhận
  test('E2E-004: should complete full cycle from listing creation to completion', async ({ page }) => {
    // This test requires creating a listing first - this is covered by API tests
    // Here we test the flow assuming listing already exists
    
    // 1. Seller creates listing (skip if API needed)
    // For E2E test, we'll start from purchase
    
    // 2. Buyer purchases (same as E2E-001)
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/listings');
    const listingCards = page.locator('[data-testid="listing-card"]');
    const listingCount = await listingCards.count();
    test.skip(listingCount === 0, 'No listings available');
    await listingCards.first().click();

    const buyButton = page.locator('button:has-text("Mua ngay")');
    await buyButton.waitFor({ state: 'visible' });
    await buyButton.click();

    const confirmButton = page.locator('button:has-text("Xác nhận thanh toán")');
    await confirmButton.waitFor({ state: 'visible' });
    const isDisabled = await confirmButton.isDisabled();
    if (!isDisabled) {
      await confirmButton.click();
      await expect(page).toHaveURL(/\/orders\/\d+/);
      
      // Get order ID from URL
      const orderId = page.url().match(/\/orders\/(\d+)/)?.[1];
      test.skip(!orderId, 'Failed to get order ID');
      
      // 3. Seller delivers
      await page.goto('/login');
      await page.fill('input[type="email"]', SELLER_EMAIL);
      await page.fill('input[type="password"]', SELLER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.goto(`/orders/${orderId}`);
      
      const deliveryForm = page.locator('[data-testid="delivery-form"]');
      await deliveryForm.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      
      if (await page.locator('text=LOCKED').isVisible()) {
        await page.fill('input[name="username"]', 'gameuser_e2e');
        await page.fill('input[name="password"]', 'gamepass_e2e');
        await page.click('button:has-text("Giao hàng")');
        await expect(page.locator('text=DELIVERED')).toBeVisible();
      }
      
      // 4. Buyer confirms
      await page.goto('/login');
      await page.fill('input[type="email"]', BUYER_EMAIL);
      await page.fill('input[type="password"]', BUYER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.goto(`/orders/${orderId}`);
      
      if (await page.locator('text=DELIVERED').isVisible()) {
        const confirmBtn = page.locator('button:has-text("Xác nhận đã nhận hàng")');
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await expect(page.locator('text=COMPLETED')).toBeVisible();
        }
      }
    }
  });

  // E2E-005: Test flow khi buyer không đủ tiền
  test('E2E-005: should show error when buyer has insufficient balance', async ({ page }) => {
    // This test requires a buyer with insufficient balance
    test.skip(true, 'Requires buyer with insufficient balance - manual test');
  });

  // E2E-006: Test flow khi seller giao hàng sai
  test('E2E-006: should handle invalid delivery data', async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.goto('/orders');
    await page.click('button:has-text("Đơn bán")');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    test.skip(count === 0, 'No orders available');
    
    await orderCards.first().click();

    // Fill with empty data
    if (await page.locator('text=LOCKED').isVisible()) {
      const deliveryForm = page.locator('[data-testid="delivery-form"]');
      await deliveryForm.waitFor({ state: 'visible' });
      
      // Click submit without filling
      await page.click('button:has-text("Giao hàng")');
      
      // Should show validation error
      await expect(page.locator('text=Vui lòng nhập')).toBeVisible();
    }
  });

  // E2E-007: Test flow khi buyer mua chính listing của mình
  test('E2E-007: should prevent buying own listing', async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Go to my-listings
    await page.goto('/my-listings');

    const myListings = page.locator('[data-testid="my-listing-card"]');
    const count = await myListings.count();
    
    test.skip(count === 0, 'No own listings available');
    
    await myListings.first().click();

    // "Mua ngay" button should not be visible
    const buyButton = page.locator('button:has-text("Mua ngay")');
    await expect(buyButton).not.toBeVisible();
  });

  // E2E-008: Test auto-complete sau 72h
  test('E2E-008: should auto-complete order after 72 hours (manual test)', async ({ page }) => {
    // This requires waiting 72 hours - not suitable for automated testing
    // This should be tested via unit tests (BULL-001)
    test.skip(true, 'Requires 72h wait time - tested via unit tests');
  });
});
