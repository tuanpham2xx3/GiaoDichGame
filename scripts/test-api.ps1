# API Test Scripts for Sprint 3
# Run these scripts to test the API endpoints

# Configuration
$BASE_URL = "http://localhost:3001/api/v1"
$TOKEN_FILE = "scripts/.tokens.json"

# Helper function to get auth token
function Get-AuthToken {
    param([string]$email, [string]$password)

    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -ContentType "application/json" -Body $body
    return $response.accessToken
}

# Helper function to save tokens
function Save-Tokens {
    param([hashtable]$tokens)

    $tokens | ConvertTo-Json | Out-File $TOKEN_FILE -Encoding UTF8
}

# Helper function to load tokens
function Load-Tokens {
    if (Test-Path $TOKEN_FILE) {
        return Get-Content $TOKEN_FILE | ConvertFrom-Json
    }
    return $null
}

# ============================================
# TEST ORD-001: Tạo order thành công
# ============================================
function Test-CreateOrderSuccess {
    Write-Host "`n=== TEST ORD-001: Tạo order thành công ===" -ForegroundColor Cyan

    try {
        # Login as buyer
        $buyerToken = Get-AuthToken -email "buyer@giaodich.com" -password "buyer123"

        # Get first published listing
        $listings = Invoke-RestMethod -Uri "$BASE_URL/listings?status=PUBLISHED" -Method GET -Headers @{Authorization = "Bearer $buyerToken"}

        if ($listings.items.Count -eq 0) {
            Write-Host "SKIP: No published listings available" -ForegroundColor Yellow
            return
        }

        $listingId = $listings.items[0].id

        # Create order
        $body = @{ listingId = $listingId } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$BASE_URL/orders" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $buyerToken"} -Body $body

        Write-Host "SUCCESS: Order created with ID: $($response.id), Status: $($response.status)" -ForegroundColor Green
        Write-Host "  - Amount: $($response.amount)"
        Write-Host "  - Buyer ID: $($response.buyerId)"
        Write-Host "  - Seller ID: $($response.sellerId)"

        return $response.id
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# TEST ORD-002: Tạo order - listing không tồn tại
# ============================================
function Test-CreateOrderNotFound {
    Write-Host "`n=== TEST ORD-002: Tạo order - listing không tồn tại ===" -ForegroundColor Cyan

    try {
        $buyerToken = Get-AuthToken -email "buyer@giaodich.com" -password "buyer123"

        $body = @{ listingId = 99999 } | ConvertTo-Json

        try {
            $response = Invoke-RestMethod -Uri "$BASE_URL/orders" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $buyerToken"} -Body $body
            Write-Host "FAILED: Should have returned 404" -ForegroundColor Red
        }
        catch {
            if ($_.Exception.Response.StatusCode -eq 404) {
                Write-Host "SUCCESS: Correctly returned 404 Not Found" -ForegroundColor Green
            }
            else {
                Write-Host "FAILED: Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# TEST ORD-009: Giao hàng thành công
# ============================================
function Test-DeliverOrderSuccess {
    param([int]$orderId)

    Write-Host "`n=== TEST ORD-009: Giao hàng thành công ===" -ForegroundColor Cyan

    try {
        # Login as seller (need to know which seller)
        $sellerToken = Get-AuthToken -email "seller@giaodich.com" -password "seller123"

        # First check order status
        $order = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId" -Method GET -Headers @{Authorization = "Bearer $sellerToken"}

        if ($order.status -ne "LOCKED") {
            Write-Host "SKIP: Order is not in LOCKED status (Current: $($order.status))" -ForegroundColor Yellow
            return
        }

        # Deliver order
        $body = @{
            username = "testuser_api"
            password = "testpass_api"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId/deliver" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $sellerToken"} -Body $body

        Write-Host "SUCCESS: Order delivered, Status: $($response.status)" -ForegroundColor Green

        return $response.id
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# TEST ORD-014: Xác nhận sớm thành công
# ============================================
function Test-ConfirmReceiptSuccess {
    param([int]$orderId)

    Write-Host "`n=== TEST ORD-014: Xác nhận sớm thành công ===" -ForegroundColor Cyan

    try {
        # Login as buyer
        $buyerToken = Get-AuthToken -email "buyer@giaodich.com" -password "buyer123"

        # First check order status
        $order = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId" -Method GET -Headers @{Authorization = "Bearer $buyerToken"}

        if ($order.status -ne "DELIVERED") {
            Write-Host "SKIP: Order is not in DELIVERED status (Current: $($order.status))" -ForegroundColor Yellow
            return
        }

        # Confirm receipt
        $response = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId/confirm" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $buyerToken"}

        Write-Host "SUCCESS: Order confirmed, Status: $($response.status)" -ForegroundColor Green

        return $response.id
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# TEST ORD-021: Xem game info thành công
# ============================================
function Test-GetGameInfoSuccess {
    param([int]$orderId)

    Write-Host "`n=== TEST ORD-021: Xem game info thành công ===" -ForegroundColor Cyan

    try {
        # Login as buyer
        $buyerToken = Get-AuthToken -email "buyer@giaodich.com" -password "buyer123"

        # First check order status
        $order = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId" -Method GET -Headers @{Authorization = "Bearer $buyerToken"}

        if ($order.status -ne "DELIVERED") {
            Write-Host "SKIP: Order is not in DELIVERED status" -ForegroundColor Yellow
            return
        }

        # Get game info
        $response = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId/game-info" -Method GET -Headers @{Authorization = "Bearer $buyerToken"}

        Write-Host "SUCCESS: Game info retrieved" -ForegroundColor Green
        Write-Host "  - Username: $($response.gameInfo.username)"
        Write-Host "  - Password: $($response.gameInfo.password)"

        return $true
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# TEST WAL-001 to WAL-003: Wallet Integration
# ============================================
function Test-WalletIntegration {
    Write-Host "`n=== TEST WAL-001 to WAL-003: Wallet Integration ===" -ForegroundColor Cyan

    try {
        # Login as buyer
        $buyerToken = Get-AuthToken -email "buyer@giaodich.com" -password "buyer123"

        # Get balance
        $balance = Invoke-RestMethod -Uri "$BASE_URL/wallet/balance" -Method GET -Headers @{Authorization = "Bearer $buyerToken"}

        Write-Host "SUCCESS: Current balance: $($balance.balance)" -ForegroundColor Green
        Write-Host "  - Available: $($balance.available)"
        Write-Host "  - Locked: $($balance.locked)"

        return $true
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================
# Run all tests
# ============================================
function Run-AllTests {
    Write-Host "=======================================" -ForegroundColor Magenta
    Write-Host "Sprint 3 API Tests" -ForegroundColor Magenta
    Write-Host "=======================================" -ForegroundColor Magenta

    # Test ORD-001
    $orderId = Test-CreateOrderSuccess

    # Test ORD-002
    Test-CreateOrderNotFound

    # Test WAL
    Test-WalletIntegration

    # If we have an order ID, test delivery and confirm
    if ($orderId) {
        Test-DeliverOrderSuccess -orderId $orderId
        Test-ConfirmReceiptSuccess -orderId $orderId
        Test-GetGameInfoSuccess -orderId $orderId
    }

    Write-Host "`n=======================================" -ForegroundColor Magenta
    Write-Host "All tests completed!" -ForegroundColor Magenta
    Write-Host "=======================================" -ForegroundColor Magenta
}

# Export functions
Export-ModuleMember -Function *
