# Push clean-main branch to vaibhav12-tech/revance-qa-automation
# Run in PowerShell from repo root:
#   .\scripts\push-to-revance.ps1

Write-Host "Step 1: Log out of cached GitHub account (likely saurabhsrana)..." -ForegroundColor Cyan
git credential-manager github logout

Write-Host ""
Write-Host "Step 2: Log in as vaibhav12-tech (browser will open)..." -ForegroundColor Cyan
git credential-manager github login

Write-Host ""
Write-Host "Step 3: Push clean history to revance-qa-automation..." -ForegroundColor Cyan
git push -u revance clean-main:main

Write-Host ""
Write-Host "Step 4: Verify remote..." -ForegroundColor Cyan
git ls-remote revance refs/heads/main

Write-Host ""
Write-Host "Done. Open: https://github.com/vaibhav12-tech/revance-qa-automation" -ForegroundColor Green
