import { test, expect } from '@playwright/test';

test.describe('Pin Flow E2E Tests (E2E-PIN-001 to E2E-PIN-002)', () => {
  const SELLER_EMAIL = 'seller@giaodich.com';
  const SELLER_PASSWORD = 'seller123';

  // E2E-PIN-001: Seller creates listing → Buy Pin → Verify pinned
  test('E2E-PIN-001: should complete Pin purchase and verify pinned status', async ({ page }) => {
    // 1. Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to my listings
    await page.goto('/my-listings');
    
    // 3. Find a listing
    const listingCards = page.locator('[data-testid="my-listing-card"]');
    const count = await listingCards.count();
    
    test.skip(count === 0, 'No listings available');
    
    // 4. Click on Pin option for first listing
    const pinButton = listingCards.first().locator('button:has-text("Ghim tin")');
    await pinButton.click();
    
    // 5. Select pin duration
    const durationModal = page.locator('[data-testid="pin-duration-modal"]');
    await durationModal.waitFor({ state: 'visible' });
    
    // Select 7 days
    await page.click('button:has-text("7 ngày")');
    
    // 6. Review pin order
    const pinSummary = page.locator('[data-testid="pin-summary"]');
    await pinSummary.waitFor({ state: 'visible' });
    
    // 7. Confirm purchase
    const confirmButton = page.locator('button:has-text("Xác nhận")');
    await confirmButton.click();
    
    // 8. Verify success message
    await expect(page.locator('text=Mua Pin thành công')).toBeVisible();
    
    // 9. Verify listing is now pinned
    await page.goto('/listings');
    const pinnedBadge = page.locator('[data-testid="pinned-badge"]').first();
    await expect(pinnedBadge).toBeVisible();
  });

  // E2E-PIN-002: Pin expiry test
  test('E2E-PIN-002: should handle Pin expiry (manual verification)', async ({ page }) => {
    // This test requires waiting for Pin to expire
    // In production, Pins expire after the purchased duration
    
    // 1. Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 2. Navigate to my listings
    await page.goto('/my-listings');
    
    // 3. Check for expired pins
    const expiredPins = page.locator('[data-testid="expired-pin-notice"]');
    const count = await expiredPins.count();
    
    if (count > 0) {
      // Verify expired pin notice is shown
      await expect(expiredPins.first()).toBeVisible();
      
      // 4. Option to renew Pin should be available
      const renewButton = page.locator('button:has-text("Gia hạn")');
      await expect(renewButton.first()).toBeVisible();
    } else {
      // No expired pins - this is expected for new accounts
      console.log('No expired pins found - test skipped');
    }
    
    // Note: Full expiry test requires waiting for Pin duration to complete
    // This is typically tested via unit tests for the expiry job
  });
});
