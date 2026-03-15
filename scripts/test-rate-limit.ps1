# GIAODICHGAME - Rate Limiting Test (TC-1-16)
# Test: 5 sai password → 429 Too Many Requests

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RATE LIMITING TEST (TC-1-16)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001"
$failedCount = 0
$successCount = 0

Write-Host "Sending 6 login requests with wrong password in 60 seconds..." -ForegroundColor Yellow
Write-Host "Expected: Requests 1-5 = 401, Request 6 = 429 (Rate Limited)`n" -ForegroundColor Yellow

1..6 | ForEach-Object {
  $attempt = $_
  try {
    $res = Invoke-WebRequest -Uri "$baseUrl/api/v1/auth/login" `
      -Method POST `
      -ContentType "application/json" `
      -Body '{"email":"test@example.com","password":"wrongpassword"}' `
      -ErrorAction Stop
    
    $statusCode = $res.StatusCode
    $successCount++
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $failedCount++
  }

  # Determine color and message
  if ($statusCode -eq 401) {
    $color = "Yellow"
    $message = "Unauthorized (Wrong password)"
  } elseif ($statusCode -eq 429) {
    $color = "Red"
    $message = "✓ RATE LIMITED!"
  } else {
    $color = "Gray"
    $message = "Unexpected status"
  }

  Write-Host "Request $attempt`: HTTP $statusCode - $message" -ForegroundColor $color
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if test passed
$rateLimited = $false
for ($i = 1; $i -le 6; $i++) {
  try {
    $res = Invoke-WebRequest -Uri "$baseUrl/api/v1/auth/login" `
      -Method POST `
      -ContentType "application/json" `
      -Body '{"email":"test@example.com","password":"wrongpassword"}' `
      -ErrorAction Stop
    if ($res.StatusCode -eq 429) { $rateLimited = $true }
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 429) { $rateLimited = $true }
  }
}

if ($rateLimited) {
  Write-Host "RESULT: ✓ PASSED - Rate limiting is working!" -ForegroundColor Green
} else {
  Write-Host "RESULT: ✗ FAILED - Rate limiting not triggered" -ForegroundColor Red
}

Write-Host "`nNote: Rate limit resets after 60 seconds" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
