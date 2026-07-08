# Reset Database - Delete all data and recreate schema
# This will DROP all tables and recreate them on next server start

$dbPath = "$PSScriptRoot\db\certifai.db"

Write-Host "====== RESETTING DATABASE ======" -ForegroundColor Cyan
Write-Host ""

# Check if database exists
if (Test-Path $dbPath) {
  Write-Host "Deleting database file: $dbPath" -ForegroundColor Yellow
  Remove-Item -Path $dbPath -Force

  if (Test-Path $dbPath) {
    Write-Host "❌ Failed to delete database" -ForegroundColor Red
    exit 1
  }

  Write-Host "✅ Database deleted successfully" -ForegroundColor Green
} else {
  Write-Host "ℹ️  Database file doesn't exist (already clean)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====== NEXT STEPS ======" -ForegroundColor Cyan
Write-Host "1. Restart the backend server:" -ForegroundColor Green
Write-Host "   cd backend && npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "2. The database will be recreated with fresh schema" -ForegroundColor Green
Write-Host ""
Write-Host "3. Run the test script:" -ForegroundColor Green
Write-Host "   .\backend\TEST_HAPPY_PATH.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ DATABASE RESET COMPLETE" -ForegroundColor Green
