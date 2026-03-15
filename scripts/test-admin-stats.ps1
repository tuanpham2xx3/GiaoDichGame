# GIAODICHGAME - Admin Stats Test
# Test: Login as Admin → Get System Statistics

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ADMIN STATS DASHBOARD TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$testPassed = $true

# 1. Login as admin
Write-Host "[1/3] Logging in as admin@giaodich.com..." -ForegroundColor Cyan
try {
  $loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"admin@giaodich.com","password":"admin123"}'
  
  $token = $loginRes.accessToken
  Write-Host "✓ Logged in as Admin successfully" -ForegroundColor Green
  Write-Host "  Permissions: $($loginRes.permissions -join ', ')" -ForegroundColor Gray
} catch {
  Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  Make sure to run: npm run db:seed" -ForegroundColor Gray
  $testPassed = $false
  exit 1
}

# 2. Get system stats
Write-Host "`n[2/3] Fetching system statistics..." -ForegroundColor Cyan
try {
  $stats = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/stats" `
    -Headers @{ Authorization = "Bearer $token" }
  
  $data = $stats.data
  
  Write-Host "`n╔══════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║     SYSTEM STATISTICS DASHBOARD          ║" -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
  
  Write-Host "`n👥  USERS" -ForegroundColor White
  Write-Host "   Total Users:      $($data.totalUsers)" -ForegroundColor Green
  
  Write-Host "`n📦  ORDERS" -ForegroundColor White
  Write-Host "   Total Orders:     $($data.totalOrders)" -ForegroundColor Green
  
  Write-Host "`n⚖️  DISPUTES" -ForegroundColor White
  Write-Host "   Total Disputes:   $($data.totalDisputes)" -ForegroundColor Yellow
  
  Write-Host "`n💰  REVENUE" -ForegroundColor White
  Write-Host "   Total Revenue:    $($data.totalRevenue) Coin" -ForegroundColor Yellow
  
  Write-Host "`n📄  LISTINGS" -ForegroundColor White
  Write-Host "   Total Listings:   $($data.totalListings)" -ForegroundColor White
  Write-Host "   Active Listings:  $($data.activeListings)" -ForegroundColor Green
  
  Write-Host "`n╔══════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║  Stats retrieved successfully! ✓         ║" -ForegroundColor Green
  Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
  
} catch {
  Write-Host "✗ Failed to fetch stats: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
}

# 3. Get users list (pagination test)
Write-Host "`n[3/3] Testing user management API..." -ForegroundColor Cyan
try {
  $usersRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/users?page=1&limit=10" `
    -Headers @{ Authorization = "Bearer $token" }
  
  Write-Host "✓ User list retrieved successfully" -ForegroundColor Green
  Write-Host "  Total users: $($usersRes.total)" -ForegroundColor Gray
  Write-Host "  Page: $($usersRes.page) / $([Math]::Ceiling($usersRes.total / $usersRes.limit))" -ForegroundColor Gray
  
  if ($usersRes.users.Count -gt 0) {
    Write-Host "`n  First 5 users:" -ForegroundColor Gray
    $usersRes.users | Select-Object -First 5 | ForEach-Object {
      $status = if ($_.isActive) { "✓ Active" } else { "✗ Banned" }
      Write-Host "    • $($_.email) - $status" -ForegroundColor White
    }
  }
} catch {
  Write-Host "✗ Failed to fetch users: $($_.Exception.Message)" -ForegroundColor Red
  $testPassed = $false
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($testPassed) {
  Write-Host "RESULT: ✓ PASSED - Admin stats working correctly!" -ForegroundColor Green
} else {
  Write-Host "RESULT: ⚠ PARTIAL - Some steps failed, check logs above" -ForegroundColor Yellow
}

Write-Host "`nAdditional admin endpoints to test:" -ForegroundColor Yellow
Write-Host "  • PATCH /admin/users/:id/ban - Ban user" -ForegroundColor Gray
Write-Host "  • PATCH /admin/users/:id/unban - Unban user" -ForegroundColor Gray
Write-Host "  • GET /admin/disputes - View all disputes" -ForegroundColor Gray
Write-Host "  • PUT /pin/admin/config - Update Pin pricing" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan
