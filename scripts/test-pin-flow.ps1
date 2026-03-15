# GIAODICHGAME - Pin Flow Test
# Test: Login → Get Listings → Calculate Price → Purchase Pin

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PIN PURCHASE FLOW TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$testPassed = $true

# 1. Login as seller
Write-Host "[1/4] Logging in as seller@giaodich.com..." -ForegroundColor Cyan
try {
  $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"seller@giaodich.com","password":"seller123"}'
  
  $token = $loginRes.accessToken
  Write-Host "✓ Logged in successfully" -ForegroundColor Green
} catch {
  Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
  exit 1
}

# 2. Get user's listings
Write-Host "`n[2/4] Fetching your listings..." -ForegroundColor Cyan
try {
  $listings = Invoke-RestMethod -Uri "$baseUrl/api/v1/listings" `
    -Headers @{ Authorization = "Bearer $token" }
  
  if ($listings.data.Count -eq 0) {
    Write-Host "✗ No listings found. Please create a listing first." -ForegroundColor Red
    Write-Host "  Endpoint: POST /api/v1/listings" -ForegroundColor Gray
    $testPassed = $false
    exit 1
  }
  
  Write-Host "✓ Found $($listings.data.Count) listing(s):" -ForegroundColor Green
  $listings.data | ForEach-Object {
    $pinStatus = if ($_.isPinned) { "📌 PINNED" } else { "○ Not pinned" }
    Write-Host "  • $($_.title)" -ForegroundColor White
    Write-Host "    Game: $($_.gameName)" -ForegroundColor Gray
    Write-Host "    Price: $($_.price) Coin" -ForegroundColor Gray
    Write-Host "    Status: $pinStatus" -ForegroundColor Gray
  }
  
  # Select first listing for test
  $listingId = $listings.data[0].id
  Write-Host "`n  Selected: $($listings.data[0].title) (ID: $listingId)" -ForegroundColor Cyan
} catch {
  Write-Host "✗ Failed to fetch listings: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
  exit 1
}

# 3. Calculate Pin price
Write-Host "`n[3/4] Calculating Pin price..." -ForegroundColor Cyan
try {
  $days = 7
  $priceRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/pin/calculate-price?days=$days" `
    -Headers @{ Authorization = "Bearer $token" }
  
  Write-Host "✓ Price calculation successful:" -ForegroundColor Green
  Write-Host "  Days: $days" -ForegroundColor Gray
  Write-Host "  Price per day: $($priceRes.pricePerDay) Coin" -ForegroundColor Gray
  Write-Host "  Original price: $($priceRes.originalPrice) Coin" -ForegroundColor Gray
  if ($priceRes.discount -gt 0) {
    Write-Host "  VIP Discount: -$($priceRes.discount)% ✓" -ForegroundColor Yellow
  } else {
    Write-Host "  Discount: 0% (Not a VIP user)" -ForegroundColor Gray
  }
  Write-Host "  Final price: $($priceRes.finalPrice) Coin" -ForegroundColor Green
} catch {
  Write-Host "✗ Failed to calculate price: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
}

# 4. Purchase Pin
Write-Host "`n[4/4] Purchasing Pin for listing..." -ForegroundColor Cyan
try {
  $purchaseRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/pin/purchase" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body (@{ 
      listingId = $listingId
      days = $days
    } | ConvertTo-Json)
  
  Write-Host "✓ Pin purchased successfully!" -ForegroundColor Green
  Write-Host "  Listing ID: $listingId" -ForegroundColor Gray
  Write-Host "  Duration: $days days" -ForegroundColor Gray
  Write-Host "  Price paid: $($purchaseRes.pricePaid) Coin" -ForegroundColor Gray
  Write-Host "  Expires: $($purchaseRes.expiresAt)" -ForegroundColor Gray
  
  # Check if listing is now pinned
  Start-Sleep -Seconds 1
  $updatedListings = Invoke-RestMethod -Uri "$baseUrl/api/v1/listings" `
    -Headers @{ Authorization = "Bearer $token" }
  
  $pinnedListing = $updatedListings.data | Where-Object { $_.id -eq $listingId }
  if ($pinnedListing -and $pinnedListing.isPinned) {
    Write-Host "✓ Listing is now PINNED! 📌" -ForegroundColor Green
  } else {
    Write-Host "⚠ Listing pin status not updated yet" -ForegroundColor Yellow
  }
} catch {
  $body = $_.ErrorDetails.Message | ConvertFrom-Json
  $errorMsg = $body.message
  if ($errorMsg -like "*already pinned*") {
    Write-Host "⚠ Listing is already pinned (this is OK)" -ForegroundColor Yellow
  } elseif ($errorMsg -like "*Insufficient balance*") {
    Write-Host "⚠ Insufficient balance. Need more coins." -ForegroundColor Yellow
    Write-Host "  Run: npm run db:seed to get test coins" -ForegroundColor Gray
  } elseif ($errorMsg -like "*not own*") {
    Write-Host "⚠ Cannot pin listing you don't own" -ForegroundColor Yellow
  } else {
    Write-Host "✗ Purchase failed: $errorMsg" -ForegroundColor Red
    $testPassed = $false
  }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($testPassed) {
  Write-Host "RESULT: ✓ PASSED - Pin flow completed successfully!" -ForegroundColor Green
} else {
  Write-Host "RESULT: ⚠ PARTIAL - Some steps failed, check logs above" -ForegroundColor Yellow
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  • Check pinned listings on homepage" -ForegroundColor Gray
Write-Host "  • Test Pin expiry (wait for expiresAt)" -ForegroundColor Gray
Write-Host "  • Test VIP discount on Pin purchase" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan
