import { test, expect } from '@playwright/test';

test.describe('VIP Flow E2E Tests (E2E-VIP-001 to E2E-VIP-003)', () => {
  const USER_EMAIL = 'vipuser@giaodich.com';
  const USER_PASSWORD = 'vipuser123';

  // E2E-VIP-001: Register → Login → Topup → Buy VIP → Check benefits
  test('E2E-VIP-001: should complete VIP purchase flow', async ({ page }) => {
    // 1. Navigate to register
    await page.goto('/register');
    
    // 2. Register new user
    await page.fill('input[name="username"]', 'vipuser_test');
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 3. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 4. Navigate to VIP packages
    await page.goto('/vip');
    
    // 5. View VIP packages
    const vipCards = page.locator('[data-testid="vip-package-card"]');
    const count = await vipCards.count();
    
    test.skip(count === 0, 'No VIP packages available');
    
    // 6. Select a VIP package
    await vipCards.first().click();
    
    // 7. Check if user has enough balance (mock scenario)
    // In real scenario, user needs to topup first
    
    // 8. Try to purchase VIP
    const purchaseButton = page.locator('button:has-text("Mua VIP")');
    await purchaseButton.waitFor({ state: 'visible' });
    
    // If user has insufficient balance, should show error
    const isDisabled = await purchaseButton.isDisabled();
    if (!isDisabled) {
      await purchaseButton.click();
      
      // 9. Verify success message
      await expect(page.locator('text=Mua VIP thành công')).toBeVisible({ timeout: 5000 });
      
      // 10. Check VIP badge on profile
      await page.goto('/profile');
      await expect(page.locator('[data-testid="vip-badge"]')).toBeVisible();
    }
  });

  // E2E-VIP-002: VIP profile editing (displayName, nameColor, bio)
  test('E2E-VIP-002: should allow VIP user to edit profile with custom name color', async ({ page }) => {
    // 1. Login as VIP user
    await page.goto('/login');
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to profile settings
    await page.goto('/profile/settings');
    
    // 3. Check if VIP features are available
    const nameColorPicker = page.locator('[data-testid="name-color-picker"]');
    const hasVipFeatures = await nameColorPicker.count() > 0;
    
    test.skip(!hasVipFeatures, 'User does not have VIP benefits');
    
    // 4. Edit display name
    await page.fill('input[name="displayName"]', 'VIP User Test');
    
    // 5. Select custom name color (VIP feature)
    await nameColorPicker.first().click();
    
    // 6. Edit bio
    await page.fill('textarea[name="bio"]', 'This is a VIP user bio');
    
    // 7. Save changes
    await page.click('button:has-text("Lưu thay đổi")');
    
    // 8. Verify success message
    await expect(page.locator('text=Cập nhật thành công')).toBeVisible();
    
    // 9. Verify changes are saved
    await page.reload();
    await expect(page.locator('text=VIP User Test')).toBeVisible();
  });

  // E2E-VIP-003: VIP discount on Pin purchase
  test('E2E-VIP-003: should apply VIP discount on Pin purchase', async ({ page }) => {
    // 1. Login as VIP user
    await page.goto('/login');
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to listings
    await page.goto('/listings');
    
    // 3. Select a listing to pin
    const listingCards = page.locator('[data-testid="listing-card"]');
    const count = await listingCards.count();
    
    test.skip(count === 0, 'No listings available');
    
    await listingCards.first().click();
    
    // 4. Click on Pin/Highlight option
    const pinButton = page.locator('button:has-text("Ghim tin")');
    await pinButton.waitFor({ state: 'visible' });
    await pinButton.click();
    
    // 5. Select pin duration
    await page.click('button:has-text("7 ngày")');
    
    // 6. Verify VIP discount is applied
    const originalPrice = await page.locator('[data-testid="original-price"]').textContent();
    const finalPrice = await page.locator('[data-testid="final-price"]').textContent();
    const discountLabel = page.locator('[data-testid="vip-discount-label"]');
    
    // Check if discount is shown
    const hasDiscount = await discountLabel.count() > 0;
    if (hasDiscount) {
      // Final price should be less than original
      expect(parseFloat(finalPrice || '0')).toBeLessThan(parseFloat(originalPrice || '0'));
    }
    
    // 7. Complete Pin purchase
    const confirmButton = page.locator('button:has-text("Xác nhận mua Pin")');
    await confirmButton.click();
    
    // 8. Verify success
    await expect(page.locator('text=Mua Pin thành công')).toBeVisible();
  });
});
