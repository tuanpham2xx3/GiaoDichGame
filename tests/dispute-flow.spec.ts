import { test, expect } from '@playwright/test';

test.describe('Dispute E2E Flow Tests (E2E-DSP-001 to E2E-DSP-003)', () => {
  const BUYER_EMAIL = 'buyer@giaodich.com';
  const BUYER_PASSWORD = 'buyer123';
  const SELLER_EMAIL = 'seller@giaodich.com';
  const SELLER_PASSWORD = 'seller123';
  const ADMIN_EMAIL = 'admin@giaodich.com';
  const ADMIN_PASSWORD = 'admin123';

  // E2E-DSP-001: Full dispute flow - Create → Respond → Resolve
  test('E2E-DSP-001: should complete full dispute flow', async ({ page }) => {
    // ========== BUYER CREATES DISPUTE ==========
    
    // 1. Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Navigate to orders
    await page.goto('/orders');
    
    // 3. Find an order with DELIVERED status (eligible for dispute)
    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    
    test.skip(count === 0, 'No orders available');
    
    // 4. Click on order to view details
    await orderCards.first().click();
    
    // 5. Check if order is DELIVERED
    const deliveredBadge = page.locator('text=DELIVERED');
    const isDelivered = await deliveredBadge.count() > 0;
    test.skip(!isDelivered, 'Order is not in DELIVERED status');
    
    // 6. Click "Mở tranh chấp"
    const disputeButton = page.locator('button:has-text("Mở tranh chấp")');
    await disputeButton.click();
    
    // 7. Fill dispute form
    await page.selectOption('select[name="reason"]', 'ACCOUNT_NOT_AS_DESCRIBED');
    await page.fill('textarea[name="description"]', 'Account credentials are incorrect');
    
    // 8. Submit dispute
    const submitButton = page.locator('button:has-text("Gửi tranh chấp")');
    await submitButton.click();
    
    // 9. Verify dispute created
    await expect(page.locator('text=Mở tranh chấp thành công')).toBeVisible();
    await expect(page.locator('text=UNDER_REVIEW')).toBeVisible();
    
    // ========== SELLER RESPONDS TO DISPUTE ==========
    
    // 10. Login as seller
    await page.goto('/login');
    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 11. Navigate to disputes
    await page.goto('/disputes');
    
    // 12. Find the dispute
    const disputeCards = page.locator('[data-testid="dispute-card"]');
    const disputeCount = await disputeCards.count();
    test.skip(disputeCount === 0, 'No disputes available');
    
    // 13. Click on dispute to view details
    await disputeCards.first().click();
    
    // 14. Send message in dispute
    await page.fill('textarea[name="message"]', 'I confirm the account details are correct');
    const sendMessageButton = page.locator('button:has-text("Gửi tin nhắn")');
    await sendMessageButton.click();
    
    // 15. Verify message sent
    await expect(page.locator('text=Gửi tin nhắn thành công')).toBeVisible();
    
    // ========== ADMIN RESOLVES DISPUTE ==========
    
    // 16. Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 17. Navigate to admin disputes
    await page.goto('/admin/disputes');
    
    // 18. Find the dispute
    const adminDisputeCards = page.locator('[data-testid="dispute-card"]');
    const adminDisputeCount = await adminDisputeCards.count();
    test.skip(adminDisputeCount === 0, 'No disputes for admin');
    
    // 19. Click to resolve dispute
    await adminDisputeCards.first().click();
    
    // 20. Select resolution
    await page.selectOption('select[name="resolution"]', 'REFUND');
    await page.fill('textarea[name="resolutionNote"]', 'Refunding to buyer due to invalid account');
    
    // 21. Submit resolution
    const resolveButton = page.locator('button:has-text("Giải quyết tranh chấp")');
    await resolveButton.click();
    
    // 22. Verify dispute resolved
    await expect(page.locator('text=Giải quyết tranh chấp thành công')).toBeVisible();
    await expect(page.locator('text=RESOLVED')).toBeVisible();
  });

  // E2E-DSP-002: Auto-refund flow (Seller did not respond within deadline)
  test('E2E-DSP-002: should handle auto-refund when seller did not respond (manual test)', async ({ page }) => {
    // This test requires waiting for the auto-refund deadline (6 hours by default)
    // This is typically tested via unit tests for the BullMQ job
    
    // 1. Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 2. Navigate to disputes
    await page.goto('/disputes');
    
    // 3. Check for auto-refunded disputes
    const autoRefundBadges = page.locator('text=AUTO_REFUND');
    const count = await autoRefundBadges.count();
    
    if (count > 0) {
      // Verify auto-refund notice
      await expect(autoRefundBadges.first()).toBeVisible();
      await expect(page.locator('text=Seller did not respond within deadline')).toBeVisible();
    } else {
      console.log('No auto-refunded disputes found - test skipped');
    }
    
    // Note: Full auto-refund test requires:
    // 1. Creating a dispute
    // 2. Waiting 6+ hours without seller response
    // 3. BullMQ job triggers auto-refund
    // This is tested via unit tests (DSP-020, DSP-021)
  });

  // E2E-DSP-003: Dispute with evidence upload
  test('E2E-DSP-003: should handle dispute with evidence upload', async ({ page }) => {
    // 1. Login as buyer
    await page.goto('/login');
    await page.fill('input[type="email"]', BUYER_EMAIL);
    await page.fill('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 2. Navigate to disputes
    await page.goto('/disputes');
    
    // 3. Find a dispute
    const disputeCards = page.locator('[data-testid="dispute-card"]');
    const count = await disputeCards.count();
    test.skip(count === 0, 'No disputes available');
    
    // 4. Click on dispute
    await disputeCards.first().click();
    
    // 5. Check for evidence upload section
    const evidenceSection = page.locator('[data-testid="evidence-section"]');
    const hasEvidenceSection = await evidenceSection.count() > 0;
    
    if (hasEvidenceSection) {
      // 6. Upload evidence (file upload test)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'evidence.png',
        mimeType: 'image/png',
        buffer: Buffer.from('test evidence content'),
      });
      
      // 7. Upload file
      const uploadButton = page.locator('button:has-text("Tải lên")');
      await uploadButton.click();
      
      // 8. Verify evidence uploaded
      await expect(page.locator('text=Tải lên thành công')).toBeVisible();
    }
  });
});
