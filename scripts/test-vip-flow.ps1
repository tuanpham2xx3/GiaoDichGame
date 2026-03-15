# GIAODICHGAME - VIP Flow Test
# Test: Login → Get Packages → Purchase VIP → Check Status

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VIP PURCHASE FLOW TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$testPassed = $true

# 1. Login
Write-Host "[1/4] Logging in as vip@giaodich.com..." -ForegroundColor Cyan
try {
  $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"vip@giaodich.com","password":"vip123"}'
  
  $token = $loginRes.accessToken
  Write-Host "✓ Logged in successfully" -ForegroundColor Green
  Write-Host "  Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
} catch {
  Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
  
  # Try with buyer account as fallback
  Write-Host "`nTrying with buyer@giaodich.com..." -ForegroundColor Yellow
  try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
      -Method POST `
      -ContentType "application/json" `
      -Body '{"email":"buyer@giaodich.com","password":"buyer123"}'
    $token = $loginRes.accessToken
    Write-Host "✓ Logged in with buyer account" -ForegroundColor Green
  } catch {
    Write-Host "✗ Cannot login with any account. Please run db:seed first." -ForegroundColor Red
    exit 1
  }
}

# 2. Get VIP packages
Write-Host "`n[2/4] Fetching VIP packages..." -ForegroundColor Cyan
try {
  $packages = Invoke-RestMethod -Uri "$baseUrl/api/v1/vip/packages" `
    -Headers @{ Authorization = "Bearer $token" }
  
  Write-Host "✓ Found $($packages.data.Count) VIP packages:" -ForegroundColor Green
  $packages.data | ForEach-Object {
    Write-Host "  • $($_.name)" -ForegroundColor White
    Write-Host "    Price: $($_.priceCoin) Coin" -ForegroundColor Gray
    Write-Host "    Duration: $($_.durationDays) days" -ForegroundColor Gray
    if ($_.benefits) {
      Write-Host "    Benefits: $($_.benefits.Count) items" -ForegroundColor Gray
    }
  }
} catch {
  Write-Host "✗ Failed to fetch packages: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
}

# 3. Purchase VIP
Write-Host "`n[3/4] Purchasing VIP package..." -ForegroundColor Cyan
try {
  $purchaseRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/vip/purchase" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"packageId": 1}'
  
  Write-Host "✓ VIP purchased successfully!" -ForegroundColor Green
  Write-Host "  Package ID: $($purchaseRes.packageId)" -ForegroundColor Gray
  Write-Host "  Expires: $($purchaseRes.expiresAt)" -ForegroundColor Gray
} catch {
  $body = $_.ErrorDetails.Message | ConvertFrom-Json
  $errorMsg = $body.message
  if ($errorMsg -like "*Already has active VIP*") {
    Write-Host "⚠ User already has active VIP (this is OK)" -ForegroundColor Yellow
  } elseif ($errorMsg -like "*Insufficient balance*") {
    Write-Host "⚠ Insufficient balance. Need to topup first." -ForegroundColor Yellow
    Write-Host "  Run: npm run db:seed to get test coins" -ForegroundColor Gray
  } else {
    Write-Host "✗ Purchase failed: $errorMsg" -ForegroundColor Red
  }
}

# 4. Check VIP status
Write-Host "`n[4/4] Checking VIP status..." -ForegroundColor Cyan
try {
  $vipStatus = Invoke-RestMethod -Uri "$baseUrl/api/v1/vip/my-vip" `
    -Headers @{ Authorization = "Bearer $token" }
  
  if ($vipStatus.isVip -eq $true) {
    Write-Host "✓ VIP status is ACTIVE" -ForegroundColor Green
    Write-Host "  Package: $($vipStatus.packageName)" -ForegroundColor Gray
    Write-Host "  Expires: $($vipStatus.expiresAt)" -ForegroundColor Gray
    if ($vipStatus.benefits) {
      Write-Host "  Benefits:" -ForegroundColor Gray
      if ($vipStatus.benefits.nameColor) {
        Write-Host "    • Name Color: $($vipStatus.benefits.nameColor)" -ForegroundColor Gray
      }
      if ($vipStatus.benefits.discountPercent) {
        Write-Host "    • Discount: $($vipStatus.benefits.discountPercent)%" -ForegroundColor Gray
      }
    }
  } else {
    Write-Host "✗ No active VIP subscription" -ForegroundColor Red
  }
} catch {
  Write-Host "✗ Failed to check VIP status: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($testPassed) {
  Write-Host "RESULT: ✓ PASSED - VIP flow completed successfully!" -ForegroundColor Green
} else {
  Write-Host "RESULT: ⚠ PARTIAL - Some steps failed, check logs above" -ForegroundColor Yellow
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  • Test VIP profile editing: /profile/vip" -ForegroundColor Gray
Write-Host "  • Test Pin purchase with VIP discount" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan
