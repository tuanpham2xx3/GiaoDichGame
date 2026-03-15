# GIAODICHGAME - Full Test Suite Runner
# Run all tests automatically

param(
    [switch]$UnitTests,
    [switch]$E2ETests,
    [switch]$ManualTests,
    [switch]$All
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001"
$webUrl = "http://localhost:3000"
$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Test-Service {
    param([string]$Name, [string]$Url)
    Write-Host "Checking $Name at $Url..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ $Name is running (HTTP $($response.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ $Name is not responding" -ForegroundColor Red
        return $false
    }
}

# Default to All if no switch specified
if (-not ($UnitTests -or $E2ETests -or $ManualTests -or $All)) {
    $All = $true
}

Write-Header "GIAODICHGAME - TEST SUITE RUNNER"
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "Node: $(node --version)" -ForegroundColor Gray
Write-Host "NPM: $(npm --version)" -ForegroundColor Gray

# Check services
Write-Header "SERVICE HEALTH CHECK"
$apiRunning = Test-Service "Backend API" "$baseUrl/api/health"
$webRunning = Test-Service "Frontend Web" "$webUrl"

if (-not $apiRunning) {
    Write-Host "`n⚠️  Backend API is not running!" -ForegroundColor Yellow
    Write-Host "Start it with: cd apps/api && npm run dev" -ForegroundColor Gray
}

if (-not $webRunning -and $E2ETests) {
    Write-Host "⚠️  Frontend Web is not running!" -ForegroundColor Yellow
    Write-Host "Start it with: cd apps/web && npm run dev" -ForegroundColor Gray
}

# Unit Tests
if ($UnitTests -or $All) {
    Write-Header "UNIT TESTS (Jest)"
    
    if (Test-Path "apps/api") {
        Write-Host "Running unit tests in apps/api..." -ForegroundColor Cyan
        
        try {
            $result = & npm run test:cov --prefix apps/api 2>&1
            $result | ForEach-Object { Write-Host $_ }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✓ Unit tests PASSED" -ForegroundColor Green
                $testResults.Passed++
            } else {
                Write-Host "`n✗ Unit tests FAILED" -ForegroundColor Red
                $testResults.Failed++
            }
        } catch {
            Write-Host "✗ Error running unit tests: $_" -ForegroundColor Red
            $testResults.Failed++
        }
    } else {
        Write-Host "✗ apps/api folder not found" -ForegroundColor Red
        $testResults.Skipped++
    }
}

# E2E Tests
if ($E2ETests -or $All) {
    Write-Header "E2E TESTS (Playwright)"
    
    if ($apiRunning -and $webRunning) {
        if (Test-Path "tests") {
            Write-Host "Running E2E tests..." -ForegroundColor Cyan
            
            try {
                $result = & npx playwright test --reporter=list 2>&1
                $result | ForEach-Object { Write-Host $_ }
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "`n✓ E2E tests PASSED" -ForegroundColor Green
                    $testResults.Passed++
                } else {
                    Write-Host "`n✗ E2E tests FAILED" -ForegroundColor Red
                    $testResults.Failed++
                }
            } catch {
                Write-Host "✗ Error running E2E tests: $_" -ForegroundColor Red
                $testResults.Failed++
            }
        } else {
            Write-Host "✗ tests folder not found" -ForegroundColor Red
            $testResults.Skipped++
        }
    } else {
        Write-Host "⚠️  Skipping E2E tests - services not running" -ForegroundColor Yellow
        $testResults.Skipped++
    }
}

# Manual API Tests
if ($ManualTests -or $All) {
    Write-Header "MANUAL API TESTS (PowerShell Scripts)"
    
    $scripts = @(
        @{ Name = "Rate Limiting Test"; File = "scripts\test-rate-limit.ps1" },
        @{ Name = "VIP Flow Test"; File = "scripts\test-vip-flow.ps1" },
        @{ Name = "Pin Flow Test"; File = "scripts\test-pin-flow.ps1" },
        @{ Name = "Admin Stats Test"; File = "scripts\test-admin-stats.ps1" }
    )
    
    foreach ($script in $scripts) {
        if (Test-Path $script.File) {
            Write-Host "`nRunning: $($script.Name)" -ForegroundColor Cyan
            Write-Host "Script: $($script.File)" -ForegroundColor Gray
            
            if ($apiRunning) {
                try {
                    & powershell -ExecutionPolicy Bypass -File $script.File
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✓ $($script.Name) completed" -ForegroundColor Green
                        $testResults.Passed++
                    } else {
                        Write-Host "⚠ $($script.Name) had issues" -ForegroundColor Yellow
                        $testResults.Failed++
                    }
                } catch {
                    Write-Host "✗ Error running $($script.Name): $_" -ForegroundColor Red
                    $testResults.Failed++
                }
            } else {
                Write-Host "⚠️  Skipping - API not running" -ForegroundColor Yellow
                $testResults.Skipped++
            }
        } else {
            Write-Host "✗ Script not found: $($script.File)" -ForegroundColor Red
            $testResults.Skipped++
        }
    }
}

# Summary
Write-Header "TEST EXECUTION SUMMARY"
Write-Host "Passed:   $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed:   $($testResults.Failed)" -ForegroundColor Red
Write-Host "Skipped:  $($testResults.Skipped)" -ForegroundColor Yellow

$totalTests = $testResults.Passed + $testResults.Failed + $testResults.Skipped
if ($totalTests -gt 0) {
    $passRate = [math]::Round(($testResults.Passed / $totalTests) * 100, 2)
    Write-Host "`nPass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } else { "Yellow" })
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Export results
$resultsPath = "test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
@testResults | ConvertTo-Json | Out-File -FilePath $resultsPath -Encoding utf8
Write-Host "Results saved to: $resultsPath" -ForegroundColor Gray
